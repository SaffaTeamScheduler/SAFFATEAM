import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealTimeSync } from '../hooks/useRealTimeSync';
import { supabase } from '../lib/supabase';
import { 
  Radio, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Clock,
  BarChart3,
  Download,
  User,
  TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

interface LiveManualLog {
  id: string;
  user_id: string;
  host_name: string;
  live_date: string;
  total_hours: number;
  created_at: string;
  updated_at: string;
}

export default function LiveHost() {
  const { user, profile } = useAuth();
  const [logs, setLogs] = useState<LiveManualLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<LiveManualLog | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  
  const [formData, setFormData] = useState({
    host_name: '',
    live_date: new Date().toISOString().split('T')[0],
    total_hours: 0
  });

  const fetchLogs = async () => {
    try {
      let query = supabase.from('live_manual_log').select('*');
      
      // Admin can see all logs, users only see their own
      if (profile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }
      
      const { data, error } = await query.order('live_date', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching live manual logs:', error);
      toast.error('Ralat semasa mengambil data log live');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user, profile]);

  // Real-time sync for live manual logs
  useRealTimeSync({
    table: 'live_manual_log',
    onUpdate: fetchLogs,
    filter: profile?.role === 'admin' ? undefined : `user_id=eq.${user?.id}`
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.host_name.trim()) {
      toast.error('Nama host tidak boleh kosong');
      return;
    }

    if (formData.total_hours <= 0) {
      toast.error('Jumlah jam mestilah lebih dari 0');
      return;
    }

    try {
      if (editingLog) {
        const { error } = await supabase
          .from('live_manual_log')
          .update({
            host_name: formData.host_name.trim(),
            live_date: formData.live_date,
            total_hours: formData.total_hours,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLog.id);

        if (error) throw error;
        toast.success('Log live berjaya dikemaskini');
      } else {
        const { error } = await supabase
          .from('live_manual_log')
          .insert([{
            user_id: user.id,
            host_name: formData.host_name.trim(),
            live_date: formData.live_date,
            total_hours: formData.total_hours
          }]);

        if (error) throw error;
        toast.success('Log live berjaya ditambah');
      }

      setShowModal(false);
      setEditingLog(null);
      setFormData({ 
        host_name: '', 
        live_date: new Date().toISOString().split('T')[0], 
        total_hours: 0 
      });
      fetchLogs();
    } catch (error) {
      console.error('Error saving live manual log:', error);
      toast.error('Ralat semasa menyimpan log live');
    }
  };

  const handleEdit = (log: LiveManualLog) => {
    setEditingLog(log);
    setFormData({
      host_name: log.host_name,
      live_date: log.live_date,
      total_hours: log.total_hours
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Adakah anda pasti ingin memadam log ini?')) return;

    try {
      const { error } = await supabase
        .from('live_manual_log')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Log live berjaya dipadam');
      fetchLogs();
    } catch (error) {
      console.error('Error deleting live manual log:', error);
      toast.error('Ralat semasa memadam log live');
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Nama Host', 'Tarikh Live', 'Jumlah Jam'],
      ...logs.map(log => [
        log.host_name,
        log.live_date, 
        log.total_hours.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log-live-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Data berjaya dieksport');
  };

  const getChartData = () => {
    return logs
      .slice(0, 30)
      .reverse()
      .map(log => ({
        date: new Date(log.live_date).toLocaleDateString('ms-MY', { 
          month: 'short', 
          day: 'numeric' 
        }),
        hours: log.total_hours,
        host: log.host_name
      }));
  };

  const getTotalHours = () => {
    return Math.round(logs.reduce((total, log) => total + log.total_hours, 0) * 100) / 100;
  };

  const getAverageHours = () => {
    if (logs.length === 0) return 0;
    return Math.round((getTotalHours() / logs.length) * 100) / 100;
  };

  const getThisWeekHours = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return Math.round(logs
      .filter(log => new Date(log.live_date) >= oneWeekAgo)
      .reduce((total, log) => total + log.total_hours, 0) * 100) / 100;
  };

  const getUniqueHosts = () => {
    const hosts = [...new Set(logs.map(log => log.host_name))];
    return hosts.length;
  };

  const canEdit = (log: LiveManualLog) => {
    return profile?.role === 'admin' || log.user_id === user?.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Radio className="h-7 w-7 mr-2 text-red-500" />
            Host LIVE
            {profile?.role === 'admin' && (
              <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                Admin View
              </span>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Rekod manual sesi live streaming dan host anda
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center"
            disabled={logs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Log Live
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Jumlah Jam
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {getTotalHours()}j
              </p>
            </div>
            <div className="bg-red-500 p-3 rounded-lg">
              <Radio className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Purata Sesi
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {getAverageHours()}j
              </p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Minggu Ini
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {getThisWeekHours()}j
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Host Unik
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {getUniqueHosts()}
              </p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <User className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'list'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Senarai
        </button>
        <button
          onClick={() => setViewMode('chart')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'chart'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Graf
        </button>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Log Live Terkini
          </h3>
          
          {logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Nama Host
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tarikh Live
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Jumlah Jam
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg mr-3">
                            <User className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {log.host_name}
                            </div>
                            {profile?.role === 'admin' && log.user_id !== user?.id && (
                              <div className="text-xs text-blue-600 dark:text-blue-400">
                                Log pengguna lain
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(log.live_date).toLocaleDateString('ms-MY', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.total_hours} jam
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {canEdit(log) && (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(log)}
                              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(log.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="Padam"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Radio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Tiada log live
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Mulakan dengan menambah log live pertama anda
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Graf Jam Live (30 Rekod Terakhir)
          </h3>
          
          {logs.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => `Tarikh: ${label}`}
                    formatter={(value, name, props) => [
                      `${value} jam`,
                      `Host: ${props.payload.host}`
                    ]}
                  />
                  <Bar dataKey="hours" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Tiada data untuk dipaparkan dalam graf
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingLog ? 'Edit Log Live' : 'Tambah Log Live'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nama Host
                </label>
                <input
                  type="text"
                  required
                  value={formData.host_name}
                  onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
                  className="input-field"
                  placeholder="Masukkan nama host live"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tarikh Live
                </label>
                <input
                  type="date"
                  required
                  value={formData.live_date}
                  onChange={(e) => setFormData({ ...formData, live_date: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jumlah Jam
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={formData.total_hours}
                  onChange={(e) => setFormData({ ...formData, total_hours: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                  placeholder="Contoh: 2.5"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingLog(null);
                    setFormData({ 
                      host_name: '', 
                      live_date: new Date().toISOString().split('T')[0], 
                      total_hours: 0 
                    });
                  }}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingLog ? 'Kemaskini' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
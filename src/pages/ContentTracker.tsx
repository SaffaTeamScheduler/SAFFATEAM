import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  TrendingUp,
  BarChart3,
  Download
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

interface ContentLog {
  id: string;
  user_id: string;
  log_date: string;
  content_count: number;
  created_at: string;
  updated_at: string;
}

export default function ContentTracker() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ContentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<ContentLog | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  
  const [formData, setFormData] = useState({
    log_date: new Date().toISOString().split('T')[0],
    content_count: 0
  });

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('content_log')
        .select('*')
        .eq('user_id', user?.id)
        .order('log_date', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching content logs:', error);
      toast.error('Ralat semasa mengambil data log content');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Check if log already exists for this date
      const existingLog = logs.find(log => log.log_date === formData.log_date);
      
      if (existingLog && !editingLog) {
        toast.error('Log untuk tarikh ini sudah wujud. Sila edit log yang sedia ada.');
        return;
      }

      if (editingLog) {
        const { error } = await supabase
          .from('content_log')
          .update({
            content_count: formData.content_count,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLog.id);

        if (error) throw error;
        toast.success('Log content berjaya dikemaskini');
      } else {
        const { error } = await supabase
          .from('content_log')
          .insert([{
            user_id: user.id,
            log_date: formData.log_date,
            content_count: formData.content_count
          }]);

        if (error) throw error;
        toast.success('Log content berjaya ditambah');
      }

      setShowModal(false);
      setEditingLog(null);
      setFormData({ log_date: new Date().toISOString().split('T')[0], content_count: 0 });
      fetchLogs();
    } catch (error) {
      console.error('Error saving content log:', error);
      toast.error('Ralat semasa menyimpan log content');
    }
  };

  const handleEdit = (log: ContentLog) => {
    setEditingLog(log);
    setFormData({
      log_date: log.log_date,
      content_count: log.content_count
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Adakah anda pasti ingin memadam log ini?')) return;

    try {
      const { error } = await supabase
        .from('content_log')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Log content berjaya dipadam');
      fetchLogs();
    } catch (error) {
      console.error('Error deleting content log:', error);
      toast.error('Ralat semasa memadam log content');
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Tarikh', 'Jumlah Content'],
      ...logs.map(log => [log.log_date, log.content_count.toString()])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Data berjaya dieksport');
  };

  const getChartData = () => {
    return logs
      .slice(0, 30) // Last 30 entries
      .reverse()
      .map(log => ({
        date: new Date(log.log_date).toLocaleDateString('ms-MY', { 
          month: 'short', 
          day: 'numeric' 
        }),
        content: log.content_count
      }));
  };

  const getTotalContent = () => {
    return logs.reduce((total, log) => total + log.content_count, 0);
  };

  const getAverageContent = () => {
    if (logs.length === 0) return 0;
    return Math.round(getTotalContent() / logs.length * 10) / 10;
  };

  const getThisWeekContent = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return logs
      .filter(log => new Date(log.log_date) >= oneWeekAgo)
      .reduce((total, log) => total + log.content_count, 0);
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
            <FileText className="h-7 w-7 mr-2 text-orange-500" />
            Content Harian
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Jejaki dan pantau pengeluaran content harian anda
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
            Tambah Log
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Jumlah Content
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {getTotalContent()}
              </p>
            </div>
            <div className="bg-orange-500 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Purata Harian
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {getAverageContent()}
              </p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
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
                {getThisWeekContent()}
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
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
            Log Content Terkini
          </h3>
          
          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(log.log_date).toLocaleDateString('ms-MY', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {log.content_count} content dihasilkan
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(log)}
                      className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Tiada log content
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Mulakan dengan menambah log content pertama anda
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Graf Content Harian (30 Hari Terakhir)
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
                    formatter={(value) => [`${value} content`, 'Jumlah']}
                  />
                  <Bar dataKey="content" fill="#f97316" />
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
              {editingLog ? 'Edit Log Content' : 'Tambah Log Content'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tarikh
                </label>
                <input
                  type="date"
                  required
                  value={formData.log_date}
                  onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jumlah Content
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.content_count}
                  onChange={(e) => setFormData({ ...formData, content_count: parseInt(e.target.value) || 0 })}
                  className="input-field"
                  placeholder="Masukkan jumlah content"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingLog(null);
                    setFormData({ log_date: new Date().toISOString().split('T')[0], content_count: 0 });
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
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Clock,
  FileText,
  Radio,
  Target,
  Users
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AnalyticsData {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalContent: number;
  totalLiveHours: number;
  weeklyContent: any[];
  weeklyLiveHours: any[];
  tasksByStatus: any[];
  projectsByStatus: any[];
  monthlyActivity: any[];
}

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData>({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalContent: 0,
    totalLiveHours: 0,
    weeklyContent: [],
    weeklyLiveHours: [],
    tasksByStatus: [],
    projectsByStatus: [],
    monthlyActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      // Fetch projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id);

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`);

      // Fetch content logs
      const { data: contentLogs } = await supabase
        .from('content_log')
        .select('*')
        .eq('user_id', user?.id)
        .gte('log_date', startDate.toISOString().split('T')[0])
        .lte('log_date', endDate.toISOString().split('T')[0])
        .order('log_date');

      // Fetch live manual logs (updated to use new table)
      const { data: liveLogs } = await supabase
        .from('live_manual_log')
        .select('*')
        .eq('user_id', user?.id)
        .gte('live_date', startDate.toISOString().split('T')[0])
        .lte('live_date', endDate.toISOString().split('T')[0])
        .order('live_date');

      // Process data
      const totalProjects = projects?.length || 0;
      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(task => task.status === 'Completed').length || 0;
      const totalContent = contentLogs?.reduce((sum, log) => sum + log.content_count, 0) || 0;
      const totalLiveHours = liveLogs?.reduce((sum, log) => sum + log.total_hours, 0) || 0;

      // Weekly content data
      const weeklyContent = processWeeklyData(contentLogs || [], 'content_count', 'log_date');
      const weeklyLiveHours = processWeeklyData(liveLogs || [], 'total_hours', 'live_date');

      // Tasks by status
      const tasksByStatus = [
        { name: 'Belum Mula', value: tasks?.filter(t => t.status === 'Not Started').length || 0, color: '#6b7280' },
        { name: 'Sedang Berjalan', value: tasks?.filter(t => t.status === 'Ongoing').length || 0, color: '#3b82f6' },
        { name: 'Selesai', value: tasks?.filter(t => t.status === 'Completed').length || 0, color: '#10b981' }
      ];

      // Projects by status
      const projectsByStatus = [
        { name: 'Belum Mula', value: projects?.filter(p => p.status === 'Not Started').length || 0, color: '#6b7280' },
        { name: 'Sedang Berjalan', value: projects?.filter(p => p.status === 'Ongoing').length || 0, color: '#3b82f6' },
        { name: 'Selesai', value: projects?.filter(p => p.status === 'Completed').length || 0, color: '#10b981' }
      ];

      setData({
        totalProjects,
        totalTasks,
        completedTasks,
        totalContent,
        totalLiveHours: Math.round(totalLiveHours * 100) / 100,
        weeklyContent,
        weeklyLiveHours,
        tasksByStatus,
        projectsByStatus,
        monthlyActivity: []
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processWeeklyData = (logs: any[], field: string, dateField: string) => {
    const weeklyData: { [key: string]: number } = {};
    
    logs.forEach(log => {
      const date = new Date(log[dateField]);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = 0;
      }
      weeklyData[weekKey] += log[field] || 0;
    });

    return Object.entries(weeklyData).map(([date, value]) => ({
      date: new Date(date).toLocaleDateString('ms-MY', { month: 'short', day: 'numeric' }),
      value: field === 'total_hours' ? Math.round(value * 100) / 100 : value
    }));
  };

  const getCompletionRate = () => {
    if (data.totalTasks === 0) return 0;
    return Math.round((data.completedTasks / data.totalTasks) * 100);
  };

  const getAverageContent = () => {
    if (data.weeklyContent.length === 0) return 0;
    const total = data.weeklyContent.reduce((sum, item) => sum + item.value, 0);
    return Math.round((total / data.weeklyContent.length) * 10) / 10;
  };

  const getAverageLiveHours = () => {
    if (data.weeklyLiveHours.length === 0) return 0;
    const total = data.weeklyLiveHours.reduce((sum, item) => sum + item.value, 0);
    return Math.round((total / data.weeklyLiveHours.length) * 100) / 100;
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
            <BarChart3 className="h-7 w-7 mr-2 text-indigo-500" />
            Analitik
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Pantau prestasi dan kemajuan kerja anda
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              timeRange === '7d'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            7 Hari
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              timeRange === '30d'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            30 Hari
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              timeRange === '90d'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            90 Hari
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Kadar Siap Tugasan
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {getCompletionRate()}%
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Target className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Purata Content/Minggu
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {getAverageContent()}
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
                Purata Jam Live/Minggu
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {getAverageLiveHours()}j
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
                Jumlah Projek Aktif
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {data.totalProjects}
              </p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trend Content Mingguan
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.weeklyContent}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} content`, 'Jumlah']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  dot={{ fill: '#f97316' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Hours Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trend Jam Live Mingguan
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.weeklyLiveHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} jam`, 'Jumlah']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Status Tugasan
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.tasksByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.tasksByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} tugasan`, 'Jumlah']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            {data.tasksByStatus.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Projects by Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Status Projek
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.projectsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} projek`, 'Jumlah']} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Ringkasan Prestasi ({timeRange === '7d' ? '7 Hari' : timeRange === '30d' ? '30 Hari' : '90 Hari'} Terakhir)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {data.totalProjects}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Jumlah Projek
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.completedTasks}/{data.totalTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Tugasan Selesai
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {data.totalContent}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Content Dihasilkan
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {data.totalLiveHours}j
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Jam Live
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
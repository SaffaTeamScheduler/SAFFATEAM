import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  Target,
  Plus,
  Radio
} from 'lucide-react';

interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  todayContent: number;
  todayLiveHours: number;
  recentActivities: any[];
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    todayContent: 0,
    todayLiveHours: 0,
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch projects count - only user's own projects
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Fetch tasks count - only user's own tasks or assigned to user
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`);

      // Fetch completed tasks count - only user's own tasks or assigned to user
      const { count: completedTaskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Completed')
        .or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`);

      // Fetch today's content - only user's own content
      const { data: contentData } = await supabase
        .from('content_log')
        .select('content_count')
        .eq('user_id', user?.id)
        .eq('log_date', today)
        .maybeSingle();

      // Fetch today's live hours from new manual log table
      const { data: liveData } = await supabase
        .from('live_manual_log')
        .select('total_hours')
        .eq('user_id', user?.id)
        .eq('live_date', today);

      // Fetch recent activities - only user's own activities
      const { data: activityData } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user?.id)
        .order('log_timestamp', { ascending: false })
        .limit(5);

      const totalLiveHours = liveData?.reduce((sum, log) => sum + (log.total_hours || 0), 0) || 0;

      setStats({
        totalProjects: projectCount || 0,
        totalTasks: taskCount || 0,
        completedTasks: completedTaskCount || 0,
        todayContent: contentData?.content_count || 0,
        todayLiveHours: totalLiveHours,
        recentActivities: activityData || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (action: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('activity_log')
        .insert([{ user_id: user.id, action }]);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleQuickAction = async (action: string, path: string) => {
    await logActivity(action);
    // In a real app, you would navigate to the appropriate page
    console.log(`Navigate to ${path}`);
  };

  const statCards = [
    {
      title: 'Jumlah Projek',
      value: stats.totalProjects,
      icon: FolderOpen,
      color: 'bg-blue-500',
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Jumlah Tugasan',
      value: stats.totalTasks,
      icon: CheckSquare,
      color: 'bg-green-500',
      textColor: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Tugasan Selesai',
      value: stats.completedTasks,
      icon: Target,
      color: 'bg-purple-500',
      textColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      title: 'Content Hari Ini',
      value: stats.todayContent,
      icon: TrendingUp,
      color: 'bg-orange-500',
      textColor: 'text-orange-600 dark:text-orange-400'
    },
    {
      title: 'Jam Live Hari Ini',
      value: `${stats.todayLiveHours.toFixed(1)}j`,
      icon: Radio,
      color: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Selamat Datang, {profile?.nama}!
        </h1>
        <p className="text-blue-100">
          Semak kemajuan kerja anda hari ini dan urusan yang perlu diselesaikan.
        </p>
        {profile?.role === 'admin' && (
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
            <Users className="h-3 w-3 mr-1" />
            Administrator
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow hover-lift"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${card.textColor} mt-1`}>
                  {card.value}
                </p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
            Aktiviti Terkini
          </h3>
          
          {stats.recentActivities.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.log_timestamp).toLocaleString('ms-MY')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Tiada aktiviti terkini
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-green-500" />
            Tindakan Pantas
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleQuickAction('Membuka halaman projek baru', '/projek')}
              className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
            >
              <FolderOpen className="h-6 w-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Projek Baru
              </p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('Membuka halaman tugasan baru', '/tugasan')}
              className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group"
            >
              <CheckSquare className="h-6 w-6 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Tugasan Baru
              </p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('Membuka halaman log content', '/content')}
              className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors group"
            >
              <TrendingUp className="h-6 w-6 text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Log Content
              </p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('Membuka halaman live manual log', '/live')}
              className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
            >
              <Radio className="h-6 w-6 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Log Live
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
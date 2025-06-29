import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealTimeSync } from '../hooks/useRealTimeSync';
import { supabase } from '../lib/supabase';
import { 
  CheckSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Filter,
  Search,
  User,
  BarChart3,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  project_id: string | null;
  due_date: string | null;
  status: 'Not Started' | 'Ongoing' | 'Completed';
  assigned_to: string | null;
  progress: number;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  projects?: { name: string };
}

interface Project {
  id: string;
  name: string;
}

export default function Tasks() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    title: '',
    project_id: '',
    due_date: '',
    status: 'Not Started' as const,
    progress: 0
  });

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects (name)
        `);
      
      // Admin can see all tasks, users only see their own or assigned to them
      if (profile?.role !== 'admin') {
        query = query.or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Ralat semasa mengambil data tugasan');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      let query = supabase.from('projects').select('id, name');
      
      // Admin can see all projects, users only see their own
      if (profile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }
      
      const { data, error } = await query.order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchProjects();
    }
  }, [user, profile]);

  // Real-time sync for tasks
  useRealTimeSync({
    table: 'tasks',
    onUpdate: fetchTasks,
    filter: profile?.role === 'admin' ? undefined : `user_id=eq.${user?.id}`
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update({
            ...formData,
            project_id: formData.project_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTask.id);

        if (error) throw error;
        toast.success('Tugasan berjaya dikemaskini');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([{
            ...formData,
            project_id: formData.project_id || null,
            user_id: user.id
          }]);

        if (error) throw error;
        toast.success('Tugasan berjaya ditambah');
      }

      setShowModal(false);
      setEditingTask(null);
      setFormData({ title: '', project_id: '', due_date: '', status: 'Not Started', progress: 0 });
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Ralat semasa menyimpan tugasan');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      project_id: task.project_id || '',
      due_date: task.due_date || '',
      status: task.status,
      progress: task.progress
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Adakah anda pasti ingin memadam tugasan ini?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Tugasan berjaya dipadam');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Ralat semasa memadam tugasan');
    }
  };

  const updateProgress = async (taskId: string, newProgress: number) => {
    try {
      const newStatus = newProgress === 100 ? 'Completed' : newProgress > 0 ? 'Ongoing' : 'Not Started';
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          progress: newProgress, 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
      toast.success('Kemajuan tugasan dikemaskini');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Ralat mengemas kini kemajuan');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'Ongoing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const canEdit = (task: Task) => {
    return profile?.role === 'admin' || task.user_id === user?.id || task.assigned_to === user?.id;
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
            <CheckSquare className="h-7 w-7 mr-2 text-green-500" />
            Tugasan
            {profile?.role === 'admin' && (
              <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                Admin View
              </span>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Urus tugasan dan pantau kemajuan kerja anda
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 sm:mt-0 btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Tugasan
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari tugasan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field pl-10 pr-8"
          >
            <option value="all">Semua Status</option>
            <option value="Not Started">Belum Mula</option>
            <option value="Ongoing">Sedang Berjalan</option>
            <option value="Completed">Selesai</option>
          </select>
        </div>
        <div className="relative">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input-field pr-8"
          >
            <option value="all">Semua Projek</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => (
          <div key={task.id} className="card hover-lift">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {task.title}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {task.status === 'Not Started' && 'Belum Mula'}
                  {task.status === 'Ongoing' && 'Sedang Berjalan'}
                  {task.status === 'Completed' && 'Selesai'}
                </span>
              </div>
              {canEdit(task) && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(task)}
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kemajuan
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {task.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(task.progress)}`}
                  style={{ width: `${task.progress}%` }}
                ></div>
              </div>
              {canEdit(task) && (
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={() => updateProgress(task.id, Math.max(0, task.progress - 25))}
                    className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    -25%
                  </button>
                  <button
                    onClick={() => updateProgress(task.id, Math.min(100, task.progress + 25))}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    +25%
                  </button>
                  <button
                    onClick={() => updateProgress(task.id, 100)}
                    className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Selesai
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {task.projects && (
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Projek: {task.projects.name}
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Tarikh Tamat: {new Date(task.due_date).toLocaleDateString('ms-MY')}
                </div>
              )}
              {profile?.role === 'admin' && (task.user_id !== user?.id && task.assigned_to !== user?.id) && (
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Tugasan pengguna lain
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Tiada tugasan dijumpai
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || statusFilter !== 'all' || projectFilter !== 'all'
              ? 'Cuba ubah kriteria carian anda'
              : 'Mulakan dengan menambah tugasan pertama anda'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingTask ? 'Edit Tugasan' : 'Tambah Tugasan Baru'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tajuk Tugasan
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                  placeholder="Masukkan tajuk tugasan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Projek
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">Pilih Projek (Opsional)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tarikh Tamat
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="input-field"
                >
                  <option value="Not Started">Belum Mula</option>
                  <option value="Ongoing">Sedang Berjalan</option>
                  <option value="Completed">Selesai</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kemajuan ({formData.progress}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTask(null);
                    setFormData({ title: '', project_id: '', due_date: '', status: 'Not Started', progress: 0 });
                  }}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingTask ? 'Kemaskini' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
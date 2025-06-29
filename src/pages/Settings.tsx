import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { 
  Settings as SettingsIcon, 
  User, 
  Moon, 
  Sun, 
  Save,
  Eye,
  EyeOff,
  Shield,
  Bell,
  Download,
  Trash2,
  Users,
  Crown,
  UserMinus
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  nama: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export default function Settings() {
  const { user, profile, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    nama: profile?.nama || '',
    email: user?.email || ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        nama: profile.nama,
        email: user?.email || ''
      });
    }
  }, [profile, user]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllUsers();
    }
  }, [profile]);

  const fetchAllUsers = async () => {
    if (profile?.role !== 'admin') return;
    
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Ralat mengambil senarai pengguna');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    if (profile?.role !== 'admin') {
      toast.error('Hanya admin boleh mengubah peranan pengguna');
      return;
    }

    if (userId === user?.id) {
      toast.error('Anda tidak boleh mengubah peranan anda sendiri');
      return;
    }

    const action = newRole === 'admin' ? 'menjadikan admin' : 'menarik balik akses admin';
    if (!confirm(`Adakah anda pasti ingin ${action} untuk pengguna ini?`)) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(`Peranan pengguna berjaya dikemaskini kepada ${newRole === 'admin' ? 'Admin' : 'Pengguna'}`);
      fetchAllUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Ralat mengemas kini peranan pengguna');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.nama.trim()) {
      toast.error('Nama tidak boleh kosong');
      return;
    }

    try {
      setLoading(true);
      await updateProfile({ nama: profileForm.nama.trim() });
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Kata laluan baru tidak sepadan');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Kata laluan mestilah sekurang-kurangnya 6 aksara');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;
      
      toast.success('Kata laluan berjaya dikemaskini');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Ralat mengemas kini kata laluan');
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch all user data
      const [projectsRes, tasksRes, contentRes, liveRes, notesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', user?.id),
        supabase.from('tasks').select('*').or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`),
        supabase.from('content_log').select('*').eq('user_id', user?.id),
        supabase.from('live_manual_log').select('*').eq('user_id', user?.id),
        supabase.from('calendar_notes').select('*').eq('user_id', user?.id)
      ]);

      const userData = {
        profile: profile,
        projects: projectsRes.data || [],
        tasks: tasksRes.data || [],
        contentLogs: contentRes.data || [],
        liveManualLogs: liveRes.data || [],
        calendarNotes: notesRes.data || [],
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saffa-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Data berjaya dieksport');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Ralat semasa mengeksport data');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    const confirmation = prompt(
      'AMARAN: Tindakan ini akan memadam akaun anda secara kekal.\n\n' +
      'Semua data anda termasuk projek, tugasan, dan log akan dipadamkan.\n\n' +
      'Taip "PADAM AKAUN" untuk mengesahkan:'
    );

    if (confirmation !== 'PADAM AKAUN') {
      return;
    }

    try {
      setLoading(true);
      
      // Delete user profile (this will cascade delete all related data)
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', user?.id);

      if (error) throw error;
      
      toast.success('Akaun berjaya dipadamkan');
      
      // Sign out user
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Ralat memadam akaun');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <SettingsIcon className="h-7 w-7 mr-2 text-gray-500" />
          Tetapan Akaun
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Urus profil, keselamatan dan tetapan aplikasi anda
        </p>
      </div>

      {/* Profile Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Maklumat Profil
        </h2>
        
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Penuh
            </label>
            <input
              type="text"
              value={profileForm.nama}
              onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
              className="input-field"
              placeholder="Masukkan nama penuh"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Alamat Email
            </label>
            <input
              type="email"
              value={profileForm.email}
              disabled
              className="input-field opacity-50 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Email tidak boleh diubah
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Peranan
            </label>
            <div className="flex items-center space-x-2">
              {profile?.role === 'admin' ? (
                <Crown className="h-4 w-4 text-yellow-500" />
              ) : (
                <Shield className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {profile?.role === 'admin' ? 'Administrator' : 'Pengguna'}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>

      {/* User Management - Only for Admins */}
      {profile?.role === 'admin' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Pengurusan Pengguna
          </h2>
          
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {allUsers.map((userItem) => (
                <div key={userItem.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      userItem.role === 'admin' ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-blue-100 dark:bg-blue-900'
                    }`}>
                      {userItem.role === 'admin' ? (
                        <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {userItem.nama}
                        {userItem.id === user?.id && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Anda)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {userItem.role === 'admin' ? 'Administrator' : 'Pengguna'}
                      </p>
                    </div>
                  </div>
                  
                  {userItem.id !== user?.id && (
                    <div className="flex items-center space-x-2">
                      {userItem.role === 'user' ? (
                        <button
                          onClick={() => handleRoleChange(userItem.id, 'admin')}
                          disabled={loading}
                          className="flex items-center px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Crown className="h-4 w-4 mr-1" />
                          Jadikan Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(userItem.id, 'user')}
                          disabled={loading}
                          className="flex items-center px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Tarik Balik Admin
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Security Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Keselamatan
        </h2>
        
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="btn-secondary"
          >
            Tukar Kata Laluan
          </button>
        ) : (
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kata Laluan Baru
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="input-field pr-10"
                  placeholder="Masukkan kata laluan baru"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sahkan Kata Laluan Baru
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="input-field"
                placeholder="Sahkan kata laluan baru"
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="btn-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Mengemas kini...' : 'Kemaskini Kata Laluan'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Theme Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tetapan Paparan
        </h2>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {theme === 'light' ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-blue-500" />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Mod {theme === 'light' ? 'Terang' : 'Gelap'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tukar antara mod terang dan gelap
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="btn-secondary"
          >
            Tukar ke Mod {theme === 'light' ? 'Gelap' : 'Terang'}
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Pengurusan Data
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Eksport Data
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Muat turun semua data anda dalam format JSON
              </p>
            </div>
            <button
              onClick={exportUserData}
              disabled={loading}
              className="btn-secondary flex items-center disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Mengeksport...' : 'Eksport Data'}
            </button>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">
                Padam Akaun
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Padam akaun dan semua data secara kekal
              </p>
            </div>
            <button
              onClick={deleteAccount}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {loading ? 'Memadam...' : 'Padam Akaun'}
            </button>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Maklumat Akaun
        </h2>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">ID Pengguna:</span>
            <span className="text-gray-900 dark:text-white font-mono text-xs">
              {user?.id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Tarikh Daftar:</span>
            <span className="text-gray-900 dark:text-white">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ms-MY') : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Kemaskini Terakhir:</span>
            <span className="text-gray-900 dark:text-white">
              {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('ms-MY') : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
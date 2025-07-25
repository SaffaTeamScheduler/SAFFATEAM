import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Images, 
  Plus, 
  Edit, 
  Trash2, 
  Download,
  Filter,
  Search,
  FileText,
  Image as ImageIcon,
  Upload,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  title: string;
  category: 'Product' | 'Daily' | 'General';
  type: 'image' | 'pdf';
  file_url: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
  user_profiles?: { nama: string };
}

export default function Templates() {
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Product' as const,
    type: 'image' as const,
    file: null as File | null
  });

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select(`
          *,
          user_profiles (nama)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Ralat semasa mengambil data template');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `templates/${fileName}`;

    setUploadProgress(0);

    try {
      // Check if bucket exists, if not create it
      const { data: buckets } = await supabase.storage.listBuckets();
      const templateBucket = buckets?.find(bucket => bucket.name === 'templates');
      
      if (!templateBucket) {
        const { error: bucketError } = await supabase.storage.createBucket('templates', {
          public: true,
          allowedMimeTypes: ['image/*', 'application/pdf'],
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (bucketError) {
          console.error('Error creating bucket:', bucketError);
          throw new Error('Ralat mencipta bucket storage');
        }
      }

      setUploadProgress(25);

      const { error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Ralat memuat naik fail: ' + uploadError.message);
      }

      setUploadProgress(75);

      const { data } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);

      setUploadProgress(100);

      if (!data.publicUrl) {
        throw new Error('Ralat mendapatkan URL fail');
      }

      return data.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim()) {
      toast.error('Tajuk template tidak boleh kosong');
      return;
    }

    if (!editingTemplate && !formData.file) {
      toast.error('Sila pilih fail untuk dimuat naik');
      return;
    }

    try {
      setUploading(true);
      let fileUrl = editingTemplate?.file_url || null;

      if (formData.file) {
        // Validate file type
        const allowedTypes = formData.type === 'image' 
          ? ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
          : ['application/pdf'];
        
        if (!allowedTypes.includes(formData.file.type)) {
          toast.error(`Jenis fail tidak disokong. Sila pilih fail ${formData.type === 'image' ? 'imej' : 'PDF'}`);
          return;
        }

        // Validate file size (10MB max)
        if (formData.file.size > 10 * 1024 * 1024) {
          toast.error('Saiz fail terlalu besar. Maksimum 10MB');
          return;
        }

        fileUrl = await uploadFile(formData.file);
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('templates')
          .update({
            title: formData.title.trim(),
            category: formData.category,
            type: formData.type,
            file_url: fileUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template berjaya dikemaskini');
      } else {
        const { error } = await supabase
          .from('templates')
          .insert([{
            title: formData.title.trim(),
            category: formData.category,
            type: formData.type,
            file_url: fileUrl,
            uploaded_by: user.id,
            uploaded_at: new Date().toISOString().split('T')[0]
          }]);

        if (error) throw error;
        toast.success('Template berjaya ditambah');
      }

      setShowModal(false);
      setEditingTemplate(null);
      setFormData({ title: '', category: 'Product', type: 'image', file: null });
      setUploadProgress(0);
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Ralat semasa menyimpan template');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      category: template.category,
      type: template.type,
      file: null
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Adakah anda pasti ingin memadam template ini?')) return;

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template berjaya dipadam');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Ralat semasa memadam template');
    }
  };

  const handleDownload = async (template: Template) => {
    if (!template.file_url) return;

    try {
      const response = await fetch(template.file_url);
      if (!response.ok) throw new Error('Ralat memuat turun fail');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.title}.${template.type === 'image' ? 'jpg' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Template berjaya dimuat turun');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Ralat semasa memuat turun template');
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesType = typeFilter === 'all' || template.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Product': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Daily': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'General': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = (template: Template) => {
    return profile?.role === 'admin' || template.uploaded_by === user?.id;
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
            <Images className="h-7 w-7 mr-2 text-pink-500" />
            Template Design
            {profile?.role === 'admin' && (
              <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                Admin View
              </span>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Koleksi template design untuk keperluan content anda
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 sm:mt-0 btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari template..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field pl-10 pr-8"
          >
            <option value="all">Semua Kategori</option>
            <option value="Product">Produk</option>
            <option value="Daily">Harian</option>
            <option value="General">Umum</option>
          </select>
        </div>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field pr-8"
          >
            <option value="all">Semua Jenis</option>
            <option value="image">Imej</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="card hover-lift">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {template.title}
                </h3>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                    {template.category === 'Product' && 'Produk'}
                    {template.category === 'Daily' && 'Harian'}
                    {template.category === 'General' && 'Umum'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    {template.type === 'image' ? 'Imej' : 'PDF'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {template.file_url && (
                  <button
                    onClick={() => handleDownload(template)}
                    className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                    title="Muat turun"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
                {canEdit(template) && (
                  <>
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Padam"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-8 flex items-center justify-center h-32">
              {template.file_url ? (
                template.type === 'image' ? (
                  <img 
                    src={template.file_url} 
                    alt={template.title}
                    className="max-h-full max-w-full object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <FileText className="h-12 w-12 text-red-500" />
                )
              ) : (
                template.type === 'image' ? (
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                ) : (
                  <FileText className="h-12 w-12 text-gray-400" />
                )
              )}
              <div className="hidden">
                {template.type === 'image' ? (
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                ) : (
                  <FileText className="h-12 w-12 text-gray-400" />
                )}
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Dimuat naik oleh: {template.user_profiles?.nama || 'Tidak diketahui'}</p>
              {template.uploaded_at && (
                <p>Tarikh: {new Date(template.uploaded_at).toLocaleDateString('ms-MY')}</p>
              )}
              {profile?.role === 'admin' && template.uploaded_by !== user?.id && (
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Template pengguna lain
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Images className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Tiada template dijumpai
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || categoryFilter !== 'all' || typeFilter !== 'all'
              ? 'Cuba ubah kriteria carian anda'
              : 'Mulakan dengan menambah template pertama anda'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingTemplate ? 'Edit Template' : 'Tambah Template Baru'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tajuk Template
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                  placeholder="Masukkan tajuk template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kategori
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="input-field"
                >
                  <option value="Product">Produk</option>
                  <option value="Daily">Harian</option>
                  <option value="General">Umum</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jenis Fail
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="input-field"
                >
                  <option value="image">Imej</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fail Template {editingTemplate ? '(Opsional - biarkan kosong jika tidak ingin ubah)' : ''}
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept={formData.type === 'image' ? 'image/*' : '.pdf'}
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    className="input-field"
                    required={!editingTemplate}
                  />
                  <Upload className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {formData.file && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="inline h-4 w-4 mr-1 text-green-500" />
                    {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              {uploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Memuat naik...</span>
                    <span className="text-gray-600 dark:text-gray-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTemplate(null);
                    setFormData({ title: '', category: 'Product', type: 'image', file: null });
                    setUploadProgress(0);
                  }}
                  className="btn-secondary flex-1"
                  disabled={uploading}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn-primary flex-1 disabled:opacity-50"
                  disabled={uploading}
                >
                  {uploading ? 'Memuat naik...' : (editingTemplate ? 'Kemaskini' : 'Tambah')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
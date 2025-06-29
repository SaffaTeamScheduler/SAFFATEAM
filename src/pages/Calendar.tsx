import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CalendarNote {
  id: string;
  user_id: string;
  note_date: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<CalendarNote | null>(null);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, currentDate]);

  const fetchNotes = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('calendar_notes')
        .select('*')
        .eq('user_id', user?.id)
        .gte('note_date', startOfMonth.toISOString().split('T')[0])
        .lte('note_date', endOfMonth.toISOString().split('T')[0])
        .order('note_date');

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Ralat semasa mengambil nota kalendar');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const existingNote = notes.find(note => 
      note.note_date === date.toISOString().split('T')[0]
    );
    
    if (existingNote) {
      setEditingNote(existingNote);
      setNoteText(existingNote.note);
    } else {
      setEditingNote(null);
      setNoteText('');
    }
    setShowModal(true);
  };

  const handleSaveNote = async () => {
    if (!user || !selectedDate || !noteText.trim()) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      if (editingNote) {
        const { error } = await supabase
          .from('calendar_notes')
          .update({
            note: noteText.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingNote.id);

        if (error) throw error;
        toast.success('Nota berjaya dikemaskini');
      } else {
        const { error } = await supabase
          .from('calendar_notes')
          .insert([{
            user_id: user.id,
            note_date: dateStr,
            note: noteText.trim()
          }]);

        if (error) throw error;
        toast.success('Nota berjaya ditambah');
      }

      setShowModal(false);
      setNoteText('');
      setEditingNote(null);
      setSelectedDate(null);
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Ralat semasa menyimpan nota');
    }
  };

  const handleDeleteNote = async () => {
    if (!editingNote) return;

    if (!confirm('Adakah anda pasti ingin memadam nota ini?')) return;

    try {
      const { error } = await supabase
        .from('calendar_notes')
        .delete()
        .eq('id', editingNote.id);

      if (error) throw error;
      toast.success('Nota berjaya dipadam');
      setShowModal(false);
      setEditingNote(null);
      setSelectedDate(null);
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Ralat semasa memadam nota');
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const hasNote = (date: Date) => {
    return notes.some(note => note.note_date === date.toISOString().split('T')[0]);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
    'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
  ];

  const dayNames = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];

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
            <CalendarIcon className="h-7 w-7 mr-2 text-purple-500" />
            Kalendar
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Urus nota dan jadual harian anda
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {getDaysInMonth(currentDate).map((date, index) => (
            <div key={index} className="aspect-square">
              {date ? (
                <button
                  onClick={() => handleDateClick(date)}
                  className={`w-full h-full p-2 text-sm rounded-lg transition-colors relative ${
                    isToday(date)
                      ? 'bg-blue-500 text-white font-semibold'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {date.getDate()}
                  {hasNote(date) && (
                    <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </button>
              ) : (
                <div className="w-full h-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Nota Terkini
        </h3>
        
        {notes.length > 0 ? (
          <div className="space-y-3">
            {notes.slice(0, 5).map((note) => (
              <div key={note.id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(note.note_date).toLocaleDateString('ms-MY', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {note.note}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDate(new Date(note.note_date));
                    setEditingNote(note);
                    setNoteText(note.note);
                    setShowModal(true);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Tiada nota dijumpai untuk bulan ini
          </p>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingNote ? 'Edit Nota' : 'Tambah Nota'}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedDate.toLocaleDateString('ms-MY', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nota
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="input-field h-32 resize-none"
                placeholder="Masukkan nota untuk tarikh ini..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNoteText('');
                  setEditingNote(null);
                  setSelectedDate(null);
                }}
                className="btn-secondary flex-1"
              >
                Batal
              </button>
              {editingNote && (
                <button
                  onClick={handleDeleteNote}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handleSaveNote}
                disabled={!noteText.trim()}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingNote ? 'Kemaskini' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { Personnel, Category } from '@/types/domain';

interface UnifiedPersonnelEditorProps {
  personnel: Personnel;
  allPersonnel: Personnel[];
  onClose: () => void;
  onUpdatePersonnel: (id: string, data: Partial<Personnel>) => Promise<void>;
  onDeletePersonnel: (id: string) => Promise<void>;
  onUploadImage: (personnelIds: string[], file: File) => Promise<void>;
}

const VALID_CATEGORIES: Category[] = ['FWC', 'FDC', 'Directing Staff', 'Allied'];

export function UnifiedPersonnelEditor({
  personnel,
  allPersonnel,
  onClose,
  onUpdatePersonnel,
  onDeletePersonnel,
  onUploadImage,
}: UnifiedPersonnelEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(personnel.imageUrl || '');

  // Find all instances of this person (same name, different categories)
  const relatedPersonnel = useMemo(() => {
    return allPersonnel.filter(p =>
      p.name.toLowerCase() === personnel.name.toLowerCase()
    );
  }, [personnel.name, allPersonnel]);

  // Categories this person has
  const currentCategories = useMemo(() => {
    return relatedPersonnel.map(p => p.category);
  }, [relatedPersonnel]);

  // Available categories to add
  const availableCategories = useMemo(() => {
    return VALID_CATEGORIES.filter(cat => !currentCategories.includes(cat));
  }, [currentCategories]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImagePreview(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Upload to all related personnel
      const personnelIds = relatedPersonnel.map(p => p.id);
      await onUploadImage(personnelIds, selectedFile);
      setSelectedFile(null);
      setImagePreview(personnel.imageUrl || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBasicInfo = async (field: string, value: any) => {
    setIsSubmitting(true);
    setError('');

    try {
      // Update all instances of this person with the same basic info
      const updates: { [key: string]: any } = {};
      if (field === 'rank') updates.rank = value;
      if (field === 'citation') updates.citation = value;
      if (field === 'decoration') updates.decoration = value;

      for (const person of relatedPersonnel) {
        await onUpdatePersonnel(person.id, updates);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async (newCategory: Category) => {
    setIsSubmitting(true);
    setError('');

    try {
      // Create new personnel record with same name but different category
      const newId = `${personnel.id}-${newCategory.toLowerCase()}`;
      const newPerson: Personnel = {
        ...personnel,
        id: newId,
        category: newCategory,
      };

      // In a real app, you'd call an API to create this
      // For now, this is handled through onUpdatePersonnel in batch
      alert(`Add new category feature - will create new ${newCategory} record`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (personId: string) => {
    if (relatedPersonnel.length === 1) {
      setError('Cannot delete the last category. Delete the person instead.');
      return;
    }

    if (!confirm(`Delete ${personId}?`)) return;

    setIsSubmitting(true);
    setError('');

    try {
      await onDeletePersonnel(personId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Unified Personnel Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-100 text-sm">
              {error}
            </div>
          )}

          {/* Image Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-orange-500" />
              Photo (applies to all categories)
            </h3>

            {imagePreview && (
              <img
                src={imagePreview}
                alt={personnel.name}
                className="h-32 w-32 rounded-lg object-cover"
              />
            )}

            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600"
              />
              {selectedFile && (
                <button
                  onClick={handleUploadImage}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {isSubmitting ? 'Uploading...' : 'Upload to all categories'}
                </button>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-3 bg-slate-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-white">Basic Information (shared across all categories)</h3>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={personnel.name}
                disabled
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Rank
              </label>
              <input
                type="text"
                defaultValue={personnel.rank}
                onBlur={(e) => handleUpdateBasicInfo('rank', e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Citation
              </label>
              <textarea
                defaultValue={personnel.citation}
                onBlur={(e) => handleUpdateBasicInfo('citation', e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Decoration (course info: e.g., "CSE 28/2019")
              </label>
              <input
                type="text"
                defaultValue={personnel.decoration || ''}
                onBlur={(e) => handleUpdateBasicInfo('decoration', e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Categories Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Categories for {personnel.name}</h3>

            <div className="space-y-2">
              {relatedPersonnel.map(person => (
                <div
                  key={person.id}
                  className="flex items-center justify-between bg-slate-800 p-3 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-white">{person.category}</div>
                    <div className="text-sm text-slate-400">
                      {person.service} • {person.periodStart}-{person.periodEnd}
                    </div>
                  </div>
                  {relatedPersonnel.length > 1 && (
                    <button
                      onClick={() => handleDeleteCategory(person.id)}
                      disabled={isSubmitting}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Category */}
            {availableCategories.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Add New Category
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddCategory(e.target.value as Category);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Select category to add...</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-100 text-sm">
            <strong>How it works:</strong> Edit basic info (rank, citation, decoration) once and it applies to all {relatedPersonnel.length} categor{relatedPersonnel.length > 1 ? 'ies' : 'y'}. Upload image once to update all.
          </div>
        </div>
      </div>
    </div>
  );
}

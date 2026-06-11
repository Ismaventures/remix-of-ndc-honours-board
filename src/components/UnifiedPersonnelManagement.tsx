import { useState, useMemo } from 'react';
import { Plus, Upload, Image as ImageIcon, ChevronDown, X, Trash2, Edit2 } from 'lucide-react';
import { Personnel, Category, Service } from '@/types/domain';
import { BatchUploadAdmin } from './BatchUploadAdmin';
import { BatchImageUpload } from './BatchImageUpload';

interface UnifiedPersonnelManagementProps {
  personnel: Personnel[];
  onAddPersonnel: (p: Omit<Personnel, 'id'>) => void;
  onUpdatePersonnel: (id: string, data: Partial<Personnel>) => void;
  onBack: () => void;
  categories: Category[];
  categoryCountsByCategory: Partial<Record<Category, number>>;
}

type UploadMode = 'none' | 'add-single' | 'batch-csv' | 'batch-image';

const CATEGORIES: Category[] = ['FWC', 'FDC', 'Directing Staff', 'Allied'];
const SERVICES: Service[] = ['Nigerian Army', 'Nigerian Navy', 'Nigerian Air Force', 'Civilian', 'Foreign'];
const MAX_MEDIA_SIZE_MB = 8;

export function UnifiedPersonnelManagement({
  personnel,
  onAddPersonnel,
  onUpdatePersonnel,
  onBack,
  categories,
  categoryCountsByCategory,
}: UnifiedPersonnelManagementProps) {
  const [uploadMode, setUploadMode] = useState<UploadMode>('none');
  const [expandedCategory, setExpandedCategory] = useState<Category | null>(null);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);

  // Count personnel by category
  const personnelByCategory = useMemo(() => {
    const counts: Record<Category, number> = {
      'FWC': 0,
      'FDC': 0,
      'Directing Staff': 0,
      'Allied': 0,
    };
    personnel.forEach(p => {
      if (p.category in counts) {
        counts[p.category]++;
      }
    });
    return counts;
  }, [personnel]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Personnel Management</h2>
          <p className="text-sm text-slate-600 mt-1">Add, batch upload, or manage personnel records with course categorization</p>
        </div>
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Content */}
      {selectedPersonnel && !editingPersonnel ? (
        // Detail View
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Detail Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-8 text-white">
            {selectedPersonnel.imageUrl && (
              <img
                src={selectedPersonnel.imageUrl}
                alt={selectedPersonnel.name}
                className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-white"
              />
            )}
            <h2 className="text-3xl font-bold">{selectedPersonnel.rank} {selectedPersonnel.name}</h2>
            <p className="text-slate-300 mt-2">{selectedPersonnel.category} • {selectedPersonnel.service}</p>
          </div>

          {/* Detail Content */}
          <div className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Rank</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{selectedPersonnel.rank}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{selectedPersonnel.category}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Service</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{selectedPersonnel.service}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Seniority</p>
                <p className="text-lg font-bold text-slate-900 mt-1">#{selectedPersonnel.seniorityOrder}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Period Start</p>
                <p className="text-lg font-bold text-blue-900 mt-1">{selectedPersonnel.periodStart}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Period End</p>
                <p className="text-lg font-bold text-blue-900 mt-1">{selectedPersonnel.periodEnd}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 col-span-2">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Decoration / Honours</p>
                <p className="text-sm font-medium text-blue-900 mt-1">{selectedPersonnel.decoration || 'None'}</p>
              </div>
            </div>

            {selectedPersonnel.citation && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Citation</p>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedPersonnel.citation}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setSelectedPersonnel(null)}
              className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
            >
              Back To List
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingPersonnel(selectedPersonnel)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                <Edit2 className="h-4 w-4" />
                Edit Profile
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete ${selectedPersonnel.name}?`)) {
                    // TODO: Implement delete functionality
                    setSelectedPersonnel(null);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : editingPersonnel ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => {
                setEditingPersonnel(null);
                setSelectedPersonnel(null);
              }}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronDown className="h-5 w-5 rotate-90" />
            </button>
            <h3 className="text-lg font-semibold text-slate-900">Edit Personnel Profile</h3>
          </div>
          <PersonnelEditForm
            initial={editingPersonnel}
            onSave={(data) => {
              onUpdatePersonnel(editingPersonnel.id, data);
              setEditingPersonnel(null);
              setSelectedPersonnel(null);
            }}
            onCancel={() => {
              setEditingPersonnel(null);
              setSelectedPersonnel(null);
            }}
          />
        </div>
      ) : uploadMode === 'none' ? (
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <p className="text-3xl font-bold text-blue-600">{personnel.length}</p>
              <p className="text-sm text-blue-700 font-medium mt-1">Total Personnel</p>
            </div>
            {CATEGORIES.map(cat => (
              <div key={cat} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                <p className="text-2xl font-bold text-slate-700">{personnelByCategory[cat]}</p>
                <p className="text-xs text-slate-600 font-medium mt-1 truncate">{cat}</p>
              </div>
            ))}
          </div>

          {/* Upload Options */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-orange-400" />
              How would you like to add personnel?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Add Single */}
              <button
                onClick={() => setUploadMode('add-single')}
                className="bg-slate-700 hover:bg-slate-600 border-2 border-slate-600 hover:border-blue-400 rounded-lg p-4 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Plus className="h-5 w-5 text-blue-400 group-hover:text-blue-300" />
                  <span className="font-semibold text-white">Add Single</span>
                </div>
                <p className="text-sm text-slate-300">Manually add one personnel record with full details</p>
              </button>

              {/* Batch CSV */}
              <button
                onClick={() => setUploadMode('batch-csv')}
                className="bg-slate-700 hover:bg-slate-600 border-2 border-slate-600 hover:border-orange-400 rounded-lg p-4 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Upload className="h-5 w-5 text-orange-400 group-hover:text-orange-300" />
                  <span className="font-semibold text-white">Batch CSV</span>
                </div>
                <p className="text-sm text-slate-300">Upload multiple personnel from CSV with course organization</p>
              </button>

              {/* Batch Images */}
              <button
                onClick={() => setUploadMode('batch-image')}
                className="bg-slate-700 hover:bg-slate-600 border-2 border-slate-600 hover:border-purple-400 rounded-lg p-4 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <ImageIcon className="h-5 w-5 text-purple-400 group-hover:text-purple-300" />
                  <span className="font-semibold text-white">Batch Images</span>
                </div>
                <p className="text-sm text-slate-300">Upload multiple images and assign to existing personnel</p>
              </button>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                Personnel by Category
              </h3>
            </div>
            <div className="divide-y divide-slate-200">
              {CATEGORIES.map(category => (
                <div key={category}>
                  <button
                    onClick={() =>
                      setExpandedCategory(expandedCategory === category ? null : category)
                    }
                    className="w-full px-6 py-4 hover:bg-slate-50 transition-colors text-left flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{category}</p>
                      <p className="text-sm text-slate-600">
                        {personnelByCategory[category]} personnel
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-600 transition-transform ${
                        expandedCategory === category ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedCategory === category && (
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 space-y-2">
                      {personnel
                        .filter(p => p.category === category)
                        .sort(
                          (a, b) =>
                            a.seniorityOrder - b.seniorityOrder || a.name.localeCompare(b.name)
                        )
                        .map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPersonnel(p)}
                            className="w-full text-left flex items-center justify-between py-2 px-3 bg-white rounded border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 group-hover:text-blue-600">
                                {p.rank} {p.name}
                              </p>
                              <p className="text-xs text-slate-600">
                                {p.service} • {p.periodStart}–{p.periodEnd}
                                {p.decoration && ` • ${p.decoration}`}
                              </p>
                            </div>
                            {p.imageUrl && (
                              <div className="ml-3 w-8 h-8 rounded overflow-hidden bg-slate-200">
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </button>
                        ))}
                      {personnelByCategory[category] === 0 && (
                        <p className="text-sm text-slate-600 italic">No personnel in this category yet</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : uploadMode === 'add-single' ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setUploadMode('none')}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronDown className="h-5 w-5 rotate-90" />
            </button>
            <h3 className="text-lg font-semibold text-slate-900">Add Single Personnel</h3>
          </div>
          <PersonnelForm onSave={onAddPersonnel} onCancel={() => setUploadMode('none')} />
        </div>
      ) : uploadMode === 'batch-csv' ? (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setUploadMode('none')}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronDown className="h-5 w-5 rotate-90" />
            </button>
            <h3 className="text-lg font-semibold text-slate-900">Batch CSV Upload</h3>
          </div>
          <BatchUploadAdmin
            onClose={() => setUploadMode('none')}
            onUploadComplete={() => setUploadMode('none')}
          />
        </div>
      ) : uploadMode === 'batch-image' ? (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setUploadMode('none')}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronDown className="h-5 w-5 rotate-90" />
            </button>
            <h3 className="text-lg font-semibold text-slate-900">Batch Image Upload</h3>
          </div>
          <BatchImageUpload
            personnel={personnel}
            onClose={() => setUploadMode('none')}
            onUploadComplete={() => setUploadMode('none')}
            onUpdatePersonnel={onUpdatePersonnel}
          />
        </div>
      ) : null}
    </div>
  );
}

// Simple single personnel form
function PersonnelForm({
  onSave,
  onCancel,
}: {
  onSave: (data: Omit<Personnel, 'id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    rank: '',
    category: 'FWC' as Category,
    service: 'Nigerian Army' as Service,
    periodStart: new Date().getFullYear(),
    periodEnd: new Date().getFullYear(),
    citation: 'Recognized for outstanding contributions to strategic leadership and national defence development.',
    decoration: '',
    imageUrl: '',
    seniorityOrder: 10,
  });

  const [courseInfo, setCourseInfo] = useState({
    courseClassification: 'FDC',
    courseNumber: '',
    courseYear: new Date().getFullYear(),
  });

  const update = (key: string, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const updateCourse = (key: string, value: string | number) =>
    setCourseInfo(prev => ({ ...prev, [key]: value }));

  const generateDecorationFromCourse = () => {
    if (courseInfo.courseNumber) {
      return `CSE ${courseInfo.courseNumber}/${courseInfo.courseYear}`;
    }
    return form.decoration;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Full Name *
          </label>
          <input
            placeholder="Name"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Rank / Title *
          </label>
          <input
            placeholder="Rank"
            value={form.rank}
            onChange={e => update('rank', e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Category
          </label>
          <select
            value={form.category}
            onChange={e => update('category', e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Service Branch
          </label>
          <select
            value={form.service}
            onChange={e => update('service', e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SERVICES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Period Start (Year)
          </label>
          <input
            type="number"
            value={form.periodStart}
            onChange={e => update('periodStart', parseInt(e.target.value))}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Period End (Year)
          </label>
          <input
            type="number"
            value={form.periodEnd}
            onChange={e => update('periodEnd', parseInt(e.target.value))}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Seniority Order
          </label>
          <input
            type="number"
            placeholder="Order (1=highest)"
            value={form.seniorityOrder}
            onChange={e => update('seniorityOrder', parseInt(e.target.value))}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Decoration / Honours
          </label>
          <input
            placeholder="e.g., CSE 42/2020"
            value={form.decoration}
            onChange={e => update('decoration', e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Image URL
        </label>
        <input
          placeholder="Image URL (optional)"
          value={form.imageUrl}
          onChange={e => update('imageUrl', e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-600 mt-1">Use batch image upload for multiple images</p>
      </div>

      {/* Course Selection Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-3">Course Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Course Classification
            </label>
            <select
              value={courseInfo.courseClassification}
              onChange={e => updateCourse('courseClassification', e.target.value)}
              className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FDC">FDC</option>
              <option value="FWC">FWC</option>
              <option value="Directing Staff">Directing Staff</option>
              <option value="Allied">Allied</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Course Number
            </label>
            <input
              type="number"
              placeholder="e.g., 42"
              value={courseInfo.courseNumber}
              onChange={e => updateCourse('courseNumber', e.target.value)}
              className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="999"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Course Year
            </label>
            <input
              type="number"
              value={courseInfo.courseYear}
              onChange={e => updateCourse('courseYear', parseInt(e.target.value))}
              className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1900"
              max="2100"
            />
          </div>
        </div>
        {courseInfo.courseNumber && (
          <p className="text-xs text-blue-700 mt-2 font-medium">
            📌 Auto-generated: CSE {courseInfo.courseNumber}/{courseInfo.courseYear}
          </p>
        )}
        <p className="text-xs text-blue-600 mt-1">
          Leave blank to use the Decoration / Honours field manually
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Citation / Bio
        </label>
        <textarea
          placeholder="Brief biography or citation"
          value={form.citation}
          onChange={e => update('citation', e.target.value)}
          rows={3}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            const finalDecoration = courseInfo.courseNumber 
              ? generateDecorationFromCourse() 
              : form.decoration;
            onSave({ ...form, decoration: finalDecoration });
          }}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
        >
          Create Record
        </button>
      </div>
    </div>
  );
}

// Personnel edit form for updating existing records
function PersonnelEditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Personnel;
  onSave: (data: Partial<Personnel>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial.name,
    rank: initial.rank,
    category: initial.category,
    service: initial.service,
    periodStart: initial.periodStart,
    periodEnd: initial.periodEnd,
    citation: initial.citation,
    decoration: initial.decoration || '',
    imageUrl: initial.imageUrl || '',
    seniorityOrder: initial.seniorityOrder,
  });

  const [courseInfo, setCourseInfo] = useState({
    courseClassification: (initial.decoration?.split(' ')[0] === 'CSE' ? 'FDC' : initial.category) as Category,
    courseNumber: initial.decoration?.match(/\d+/)?.[0] || '',
    courseYear: initial.periodStart,
  });

  const [useCourseFormat, setUseCourseFormat] = useState(!!initial.decoration?.includes('/'));

  const update = (key: string, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const updateCourse = (key: string, value: string | number) =>
    setCourseInfo(prev => ({ ...prev, [key]: value }));

  const generateDecorationFromCourse = () => {
    if (courseInfo.courseNumber) {
      return `CSE ${courseInfo.courseNumber}/${courseInfo.courseYear}`;
    }
    return form.decoration;
  };

  const handleSave = () => {
    const finalDecoration = useCourseFormat && courseInfo.courseNumber
      ? generateDecorationFromCourse()
      : form.decoration;
    onSave({ ...form, decoration: finalDecoration });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
          Basic Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              placeholder="Name"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Rank / Title
            </label>
            <input
              placeholder="Rank"
              value={form.rank}
              onChange={e => update('rank', e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={e => update('category', e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Service Branch
            </label>
            <select
              value={form.service}
              onChange={e => update('service', e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SERVICES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Service Period & Seniority */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
          Service Period & Seniority
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Period Start (Year)
            </label>
            <input
              type="number"
              value={form.periodStart}
              onChange={e => update('periodStart', parseInt(e.target.value))}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Period End (Year)
            </label>
            <input
              type="number"
              value={form.periodEnd}
              onChange={e => update('periodEnd', parseInt(e.target.value))}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Seniority Order
            </label>
            <input
              type="number"
              placeholder="Order (1=highest)"
              value={form.seniorityOrder}
              onChange={e => update('seniorityOrder', parseInt(e.target.value))}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Course Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
          <h4 className="text-sm font-semibold text-blue-900">Course Information</h4>
          <label className="ml-auto flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useCourseFormat}
              onChange={e => setUseCourseFormat(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2"
            />
            <span className="text-xs font-medium text-blue-700">Use CSE Format</span>
          </label>
        </div>

        {useCourseFormat ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Course Classification
                </label>
                <select
                  value={courseInfo.courseClassification}
                  onChange={e => updateCourse('courseClassification', e.target.value)}
                  className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="FDC">FDC - Fellows of Defence College</option>
                  <option value="FWC">FWC - Fellows of War College</option>
                  <option value="Directing Staff">Directing Staff</option>
                  <option value="Allied">Allied</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Course Number *
                </label>
                <input
                  type="number"
                  placeholder="E.g., 1, 42, etc."
                  value={courseInfo.courseNumber}
                  onChange={e => updateCourse('courseNumber', e.target.value)}
                  className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="999"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Graduation Year *
                </label>
                <input
                  type="number"
                  placeholder="E.g., 1993, 2020"
                  value={courseInfo.courseYear}
                  onChange={e => updateCourse('courseYear', parseInt(e.target.value))}
                  className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1900"
                  max="2100"
                />
              </div>
            </div>
            {courseInfo.courseNumber && (
              <div className="bg-white rounded border border-blue-300 p-3 flex items-center gap-3">
                <span className="text-sm font-semibold text-blue-900">📌 Auto-generated:</span>
                <span className="text-lg font-bold text-blue-600">CSE {courseInfo.courseNumber}/{courseInfo.courseYear}</span>
              </div>
            )}
            <p className="text-xs text-blue-600">
              Format: CSE [course_number]/[graduation_year] - automatically populates Decoration field
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Decoration / Honours (Manual)
            </label>
            <input
              placeholder="e.g., CSE 42/2020, FDC Course 5"
              value={form.decoration}
              onChange={e => update('decoration', e.target.value)}
              className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-blue-600 mt-1">
              Enable "Use CSE Format" above to auto-generate from course info
            </p>
          </div>
        )}
      </div>

      {/* Additional Information */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">4</span>
          Additional Information
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Citation / Biography
            </label>
            <textarea
              placeholder="Brief biography or role description"
              value={form.citation}
              onChange={e => update('citation', e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Image URL
            </label>
            <input
              placeholder="Image URL (optional)"
              value={form.imageUrl}
              onChange={e => update('imageUrl', e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-600 mt-1">Use batch image upload to change images</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

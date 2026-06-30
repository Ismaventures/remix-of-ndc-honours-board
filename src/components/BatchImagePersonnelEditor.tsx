import { useState, useMemo, useCallback } from 'react';
import { Search, Edit2, Save, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Personnel, VALID_SERVICES, VALID_CATEGORIES } from '@/types/domain';

interface ImagePersonnelPair {
  imageUrl: string;
  imageFile?: File;
  personnel: Personnel;
}

interface BatchEditChanges {
  [personnelId: string]: Partial<Personnel>;
}

interface BatchImagePersonnelEditorProps {
  imagedPersonnel: ImagePersonnelPair[];
  onSaveChanges: (changes: BatchEditChanges) => Promise<void>;
  onClose: () => void;
}

export function BatchImagePersonnelEditor({
  imagedPersonnel,
  onSaveChanges,
  onClose,
}: BatchImagePersonnelEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [changes, setChanges] = useState<BatchEditChanges>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Filter based on search query
  const filteredPersonnel = useMemo(() => {
    return imagedPersonnel.filter(pair =>
      pair.personnel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.personnel.rank.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [imagedPersonnel, searchQuery]);

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPersonnel.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPersonnel.map(p => p.personnel.id)));
    }
  };

  // Update personnel field
  const updatePersonnelField = (id: string, field: keyof Personnel, value: any) => {
    setChanges(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  // Bulk update selected records
  const bulkUpdateField = (field: keyof Personnel, value: any) => {
    const newChanges = { ...changes };
    selectedIds.forEach(id => {
      newChanges[id] = {
        ...newChanges[id],
        [field]: value,
      };
    });
    setChanges(newChanges);
  };

  // Save changes
  const handleSaveChanges = async () => {
    if (Object.keys(changes).length === 0) {
      setSaveStatus({ type: 'error', message: 'No changes to save' });
      return;
    }

    setSaving(true);
    try {
      await onSaveChanges(changes);
      setSaveStatus({ type: 'success', message: `Updated ${Object.keys(changes).length} record(s)` });
      setChanges({});
      setSelectedIds(new Set());
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
    } catch (error) {
      setSaveStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save changes',
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Batch Edit Personnel Records</h2>
            <p className="text-sm text-slate-400 mt-1">
              {filteredPersonnel.length} record(s) • {selectedIds.size} selected • {hasChanges ? `${Object.keys(changes).length} modified` : 'No changes'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Status Messages */}
        {saveStatus.type && (
          <div
            className={`px-6 py-3 flex items-center gap-2 ${
              saveStatus.type === 'success'
                ? 'bg-green-500/10 border-b border-green-500/30'
                : 'bg-red-500/10 border-b border-red-500/30'
            }`}
          >
            {saveStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <p
              className={`text-sm ${
                saveStatus.type === 'success' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {saveStatus.message}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Search & Bulk Actions */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or rank..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Bulk Edit Options */}
            {selectedIds.size > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-white">
                  Bulk Edit {selectedIds.size} Selected Record(s)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <select
                    onChange={(e) => bulkUpdateField('rank', e.target.value)}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Set Rank...</option>
                    <option value="Private">Private</option>
                    <option value="Captain">Captain</option>
                    <option value="Colonel">Colonel</option>
                    <option value="Brigadier General">Brigadier General</option>
                    <option value="Major General">Major General</option>
                    <option value="General">General</option>
                  </select>

                  <select
                    onChange={(e) => bulkUpdateField('category', e.target.value)}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Set Category...</option>
                    {VALID_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <select
                    onChange={(e) => bulkUpdateField('service', e.target.value)}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Set Service...</option>
                    {VALID_SERVICES.map(svc => (
                      <option key={svc} value={svc}>{svc}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Set Seniority"
                    onChange={(e) => bulkUpdateField('seniorityOrder', e.target.value ? parseInt(e.target.value) : null)}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Personnel List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Select All Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredPersonnel.length && filteredPersonnel.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-slate-600 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-slate-400">
                {filteredPersonnel.length > 0 ? `Select All (${filteredPersonnel.length})` : 'No results'}
              </span>
            </div>

            {/* Individual Records */}
            {filteredPersonnel.map(pair => {
              const recordChanges = changes[pair.personnel.id] || {};
              const isEditing = editingId === pair.personnel.id;

              return (
                <div
                  key={pair.personnel.id}
                  className={`p-4 rounded-lg border ${
                    selectedIds.has(pair.personnel.id)
                      ? 'bg-orange-500/10 border-orange-500/50'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  {/* Record Header */}
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(pair.personnel.id)}
                      onChange={() => toggleSelect(pair.personnel.id)}
                      className="w-5 h-5 rounded border-slate-600 text-orange-500 focus:ring-orange-500 mt-1"
                    />

                    {/* Image Preview */}
                    {pair.imageUrl && (
                      <img
                        src={pair.imageUrl}
                        alt={pair.personnel.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}

                    {/* Personnel Info */}
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-2 grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={recordChanges.name ?? pair.personnel.name}
                            onChange={(e) => updatePersonnelField(pair.personnel.id, 'name', e.target.value)}
                            placeholder="Name"
                            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                          />
                          <input
                            type="text"
                            value={recordChanges.rank ?? pair.personnel.rank}
                            onChange={(e) => updatePersonnelField(pair.personnel.id, 'rank', e.target.value)}
                            placeholder="Rank"
                            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                          />
                          <select
                            value={recordChanges.category ?? pair.personnel.category}
                            onChange={(e) => updatePersonnelField(pair.personnel.id, 'category', e.target.value)}
                            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                          >
                            {VALID_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                           <select
                            value={VALID_SERVICES.includes((recordChanges.service ?? pair.personnel.service) as any) ? (recordChanges.service ?? pair.personnel.service) : 'custom'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                updatePersonnelField(pair.personnel.id, 'service', '');
                              } else {
                                updatePersonnelField(pair.personnel.id, 'service', val);
                              }
                            }}
                            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                          >
                            {VALID_SERVICES.map(svc => (
                              <option key={svc} value={svc}>{svc}</option>
                            ))}
                            <option value="custom">Other / Custom...</option>
                          </select>
                          {!VALID_SERVICES.includes((recordChanges.service ?? pair.personnel.service) as any) && (
                            <input
                              type="text"
                              placeholder="Custom Service"
                              value={recordChanges.service ?? pair.personnel.service}
                              onChange={(e) => updatePersonnelField(pair.personnel.id, 'service', e.target.value)}
                              className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm col-span-2"
                            />
                          )}
                          <input
                            type="number"
                            value={recordChanges.periodStart ?? pair.personnel.periodStart ?? ''}
                            onChange={(e) => updatePersonnelField(pair.personnel.id, 'periodStart', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="Start Year"
                            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                          />
                          <input
                            type="number"
                            value={recordChanges.periodEnd ?? pair.personnel.periodEnd ?? ''}
                            onChange={(e) => updatePersonnelField(pair.personnel.id, 'periodEnd', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="End Year"
                            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                          />
                          <input
                            type="number"
                            value={recordChanges.seniorityOrder ?? pair.personnel.seniorityOrder ?? ''}
                            onChange={(e) => updatePersonnelField(pair.personnel.id, 'seniorityOrder', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="Seniority"
                            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                          />
                          <textarea
                            value={recordChanges.citation ?? pair.personnel.citation ?? ''}
                            onChange={(e) => updatePersonnelField(pair.personnel.id, 'citation', e.target.value)}
                            placeholder="Citation"
                            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm col-span-2 rows-2"
                          />
                          <input
                            type="text"
                            value={recordChanges.decoration ?? pair.personnel.decoration ?? ''}
                            onChange={(e) => updatePersonnelField(pair.personnel.id, 'decoration', e.target.value)}
                            placeholder="Decoration/Honours"
                            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm col-span-2"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-white">{pair.personnel.name}</p>
                          <p className="text-sm text-slate-400">
                            {pair.personnel.rank} • {pair.personnel.category} • {pair.personnel.service}
                          </p>
                          {pair.personnel.citation && (
                            <p className="text-sm text-slate-300 mt-1">{pair.personnel.citation}</p>
                          )}
                          {Object.keys(recordChanges).length > 0 && (
                            <p className="text-xs text-orange-400 mt-1">
                              ✓ {Object.keys(recordChanges).length} field(s) modified
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 hover:bg-slate-700 rounded text-green-500 transition-colors"
                            title="Done editing"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditingId(pair.personnel.id)}
                          className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-orange-500 transition-colors"
                          title="Edit record"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {hasChanges && (
              <span className="text-orange-400 font-medium">
                {Object.keys(changes).length} record(s) ready to save
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={!hasChanges || saving}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                hasChanges
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

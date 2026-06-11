import { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Upload, ArrowLeft, Trash2, Eye, EyeOff } from 'lucide-react';
import { BatchPersonnelRecord, BatchUploadConfig } from '@/types/batchUpload';
import { Service } from '@/types/domain';
import { BATCH_UPLOAD_CONSTRAINTS } from '@/types/batchUpload';

interface BatchPersonnelUploadTableProps {
  config: BatchUploadConfig;
  records: BatchPersonnelRecord[];
  onUpload: (validRecords: BatchPersonnelRecord[]) => Promise<void>;
  onBack: () => void;
  isUploading?: boolean;
}

export function BatchPersonnelUploadTable({
  config,
  records,
  onUpload,
  onBack,
  isUploading = false,
}: BatchPersonnelUploadTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [filterErrors, setFilterErrors] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set(records.map((_, i) => i)));

  const validRecords = useMemo(() => records.filter(r => r.isValid !== false), [records]);
  const invalidRecords = useMemo(() => records.filter(r => r.isValid === false), [records]);

  const stats = {
    total: records.length,
    valid: validRecords.length,
    invalid: invalidRecords.length,
    selected: selectedRecords.size,
  };

  const displayRecords = filterErrors ? invalidRecords : records;

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const toggleRecordSelection = (index: number) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRecords(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRecords.size === validRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(validRecords.map((_, i) => records.indexOf(records[i]))));
    }
  };

  const recordsToUpload = validRecords.filter((_, idx) => selectedRecords.has(records.indexOf(records[idx])));

  const handleUpload = async () => {
    if (recordsToUpload.length === 0) {
      alert('Please select at least one valid record to upload');
      return;
    }

    if (recordsToUpload.length > BATCH_UPLOAD_CONSTRAINTS.MAX_RECORDS_PER_UPLOAD) {
      alert(`Cannot upload more than ${BATCH_UPLOAD_CONSTRAINTS.MAX_RECORDS_PER_UPLOAD} records`);
      return;
    }

    await onUpload(recordsToUpload);
  };

  return (
    <div className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Personnel Records</h2>
          <p className="text-gray-600 mt-1">
            {config.courseClassification} – Course {config.courseNumber} ({config.graduationYear})
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          disabled={isUploading}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Configuration
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Records"
          value={stats.total}
          icon="📊"
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Valid"
          value={stats.valid}
          icon="✓"
          color="bg-green-50 text-green-700"
        />
        <StatCard
          label="Invalid"
          value={stats.invalid}
          icon="✗"
          color={stats.invalid > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}
        />
        <StatCard
          label="Selected"
          value={stats.selected}
          icon="☑"
          color="bg-purple-50 text-purple-700"
        />
      </div>

      {/* Warnings */}
      {stats.invalid > 0 && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">
                {stats.invalid} record{stats.invalid !== 1 ? 's' : ''} have validation errors
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Only valid records will be uploaded. Review errors below to fix your data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Toggle */}
      <div className="flex items-center gap-4 border-b pb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterErrors}
            onChange={(e) => setFilterErrors(e.target.checked)}
            disabled={stats.invalid === 0}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700">Show only records with errors</span>
        </label>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedRecords.size === validRecords.length && validRecords.length > 0}
                  onChange={toggleSelectAll}
                  disabled={validRecords.length === 0}
                  className="w-4 h-4"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Row</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rank</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {filterErrors
                    ? 'No records with errors'
                    : 'No records loaded'}
                </td>
              </tr>
            ) : (
              displayRecords.map((record, idx) => {
                const actualIdx = records.indexOf(record);
                const isExpanded = expandedRows.has(actualIdx);
                const isSelected = selectedRecords.has(actualIdx);

                return (
                  <tbody key={actualIdx}>
                    <tr className={`border-b border-gray-200 hover:bg-gray-50 ${!record.isValid ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        {record.isValid && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecordSelection(actualIdx)}
                            className="w-4 h-4"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.rowIndex}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.rank}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.service}</td>
                      <td className="px-4 py-3">
                        {record.isValid ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-medium">
                            <AlertCircle className="w-4 h-4" />
                            Invalid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => toggleRowExpansion(actualIdx)}
                          className="text-blue-600 hover:text-blue-700"
                          title={isExpanded ? 'Hide details' : 'Show details'}
                        >
                          {isExpanded ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-2 text-sm">
                            {record.citation && (
                              <div>
                                <span className="font-medium text-gray-700">Citation:</span>
                                <p className="text-gray-600 ml-4">{record.citation}</p>
                              </div>
                            )}
                            {record.seniorityOrder !== undefined && (
                              <div>
                                <span className="font-medium text-gray-700">Seniority Order:</span>
                                <p className="text-gray-600 ml-4">{record.seniorityOrder}</p>
                              </div>
                            )}
                            {record.imageFileName && (
                              <div>
                                <span className="font-medium text-gray-700">Image File:</span>
                                <p className="text-gray-600 ml-4">{record.imageFileName}</p>
                              </div>
                            )}
                            {!record.isValid && record.validationErrors && record.validationErrors.length > 0 && (
                              <div>
                                <span className="font-medium text-red-700">Errors:</span>
                                <ul className="text-red-600 ml-4 list-disc list-inside">
                                  {record.validationErrors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Information */}
      {stats.valid > 0 && (
        <div className="bg-blue-50 rounded-md border border-blue-200 p-4">
          <p className="text-sm text-blue-900">
            <strong>Upload Summary:</strong> {stats.selected} of {stats.valid} valid records will be uploaded.
            Records will be automatically assigned to course <strong>{config.courseNumber}</strong> graduating
            in <strong>{config.graduationYear}</strong>.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t">
        <button
          onClick={onBack}
          disabled={isUploading}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back
        </button>
        <button
          onClick={handleUpload}
          disabled={isUploading || stats.selected === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-md font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload {stats.selected} Record{stats.selected !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className={`rounded-lg p-4 ${color}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

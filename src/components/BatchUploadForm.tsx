import { useState } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { Category } from '@/types/domain';
import { BatchUploadConfig, BATCH_UPLOAD_CONSTRAINTS } from '@/types/batchUpload';
import { validateUploadFile, formatFileSize } from '@/lib/batchUploadUtils';

interface BatchUploadFormProps {
  onConfigSubmit: (config: BatchUploadConfig, file: File) => void;
  isLoading?: boolean;
}

export function BatchUploadForm({ onConfigSubmit, isLoading = false }: BatchUploadFormProps) {
  const [config, setConfig] = useState<BatchUploadConfig>({
    courseClassification: 'Directing Staff',
    courseNumber: 1,
    graduationYear: new Date().getFullYear(),
    description: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const courseClassifications: Category[] = [
    'Directing Staff',
    'FDC',
    'FWC',
    'Allied',
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }

    const validation = validateUploadFile(file);
    if (!validation.valid) {
      setFileError(validation.error || 'Invalid file');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setFileError(null);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!config.courseClassification) {
      errors.push('Course classification is required');
    }

    if (!config.courseNumber || config.courseNumber < 1) {
      errors.push('Course number must be a positive number');
    }

    if (!config.graduationYear || config.graduationYear < 1900 || config.graduationYear > 2100) {
      errors.push('Graduation year must be between 1900 and 2100');
    }

    if (!selectedFile) {
      errors.push('You must select a file to upload');
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!selectedFile) {
      setFormErrors(['File is required']);
      return;
    }

    onConfigSubmit(config, selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900">Batch Upload Configuration</h2>

      {/* Error Messages */}
      {formErrors.length > 0 && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Please fix the following errors:</h3>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                {formErrors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Course Configuration Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Course Information</h3>

        {/* Course Classification */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Course Classification <span className="text-red-600">*</span>
          </label>
          <select
            value={config.courseClassification}
            onChange={(e) =>
              setConfig({ ...config, courseClassification: e.target.value as Category })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="">Select classification...</option>
            {courseClassifications.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Examples: Directing Staff, FDC (Fellows of Directing Staff), FWC (Fellows of War College), Allied
          </p>
        </div>

        {/* Course Number */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Number <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="999"
              value={config.courseNumber}
              onChange={(e) =>
                setConfig({ ...config, courseNumber: parseInt(e.target.value) || 1 })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-500">E.g., 1, 2, 42, etc.</p>
          </div>

          {/* Graduation Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Graduation Year <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              min="1900"
              max="2100"
              value={config.graduationYear}
              onChange={(e) =>
                setConfig({ ...config, graduationYear: parseInt(e.target.value) || new Date().getFullYear() })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-500">E.g., 1986, 2020, 2024</p>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-blue-50 rounded-md border border-blue-200 p-3">
          <p className="text-sm text-blue-900">
            <strong>Course Format:</strong> {`Course ${config.courseNumber} – ${config.graduationYear}`}
          </p>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900">Upload Personnel File</h3>

        <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8">
          <input
            type="file"
            id="file-upload"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            disabled={isLoading}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center cursor-pointer hover:opacity-75 transition-opacity"
          >
            <Upload className="w-12 h-12 text-gray-400 mb-2" />
            <span className="text-base font-medium text-gray-900">
              {selectedFile ? selectedFile.name : 'Click to select file or drag and drop'}
            </span>
            <span className="text-sm text-gray-500 mt-1">
              {selectedFile
                ? `File size: ${formatFileSize(selectedFile.size)}`
                : `CSV or Excel files, up to ${formatFileSize(BATCH_UPLOAD_CONSTRAINTS.MAX_IMAGE_SIZE_BYTES * 5)}`}
            </span>
          </label>
        </div>

        {fileError && (
          <div className="flex gap-2 text-red-700 text-sm bg-red-50 border border-red-200 rounded p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{fileError}</span>
          </div>
        )}

        {selectedFile && (
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setFileError(null);
              const input = document.getElementById('file-upload') as HTMLInputElement;
              if (input) input.value = '';
            }}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
            Clear selection
          </button>
        )}
      </div>

      {/* File Format Guide */}
      <div className="bg-blue-50 rounded-md border border-blue-200 p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Expected File Format</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>CSV Format:</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Column A: Name (required)</li>
            <li>Column B: Rank (required)</li>
            <li>Column C: Service (required) - Nigerian Army, Nigerian Navy, Nigerian Air Force, Civilian, Foreign, Foreign Service, or Academic</li>
            <li>Column D: Citation (optional)</li>
            <li>Column E: Seniority Order (optional)</li>
            <li>Column F: Image File Name (optional) - Leave blank if no image</li>
          </ul>
          <p className="mt-2"><strong>Max records per upload:</strong> {BATCH_UPLOAD_CONSTRAINTS.MAX_RECORDS_PER_UPLOAD}</p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-6 border-t">
        <button
          type="submit"
          disabled={isLoading || !selectedFile}
          className="flex-1 bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Continue to Preview'}
        </button>
      </div>
    </form>
  );
}

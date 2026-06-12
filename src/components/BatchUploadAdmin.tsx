import { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { BatchUploadConfig, BatchPersonnelRecord, BatchUploadResult } from '@/types/batchUpload';
import { parseCSV, validateBatchRecords } from '@/lib/batchUploadUtils';
import { uploadBatchPersonnel, createCourseCategory } from '@/lib/batchUploadDb';
import { BatchUploadForm } from './BatchUploadForm';
import { BatchPersonnelUploadTable } from './BatchPersonnelUploadTable';

type UploadStep = 'configure' | 'preview' | 'uploading' | 'complete';

interface BatchUploadAdminProps {
  onClose: () => void;
  onUploadComplete?: (results: BatchUploadResult[]) => void;
}

export function BatchUploadAdmin({ onClose, onUploadComplete }: BatchUploadAdminProps) {
  const [step, setStep] = useState<UploadStep>('configure');
  const [config, setConfig] = useState<BatchUploadConfig | null>(null);
  const [records, setRecords] = useState<BatchPersonnelRecord[]>([]);
  const [uploadResults, setUploadResults] = useState<BatchUploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle file upload and parsing
  const handleConfigSubmit = useCallback(async (uploadConfig: BatchUploadConfig, file: File) => {
    setError(null);
    setIsLoading(true);

    try {
      // Read and parse file
      const fileContent = await file.text();
      const parsedRecords = parseCSV(fileContent);

      if (parsedRecords.length === 0) {
        setError('No valid records found in file. Please check the file format.');
        setIsLoading(false);
        return;
      }

      // Validate records
      const validatedRecords = validateBatchRecords(parsedRecords);

      setConfig(uploadConfig);
      setRecords(validatedRecords);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle batch upload
  const handleUpload = useCallback(async (recordsToUpload: BatchPersonnelRecord[]) => {
    if (!config) {
      setError('Configuration missing');
      return;
    }

    setError(null);
    setIsLoading(true);
    setStep('uploading');

    try {
      // Upload all records
      const results = await uploadBatchPersonnel(config, recordsToUpload);

      // Create course category metadata
      const successCount = results.filter(r => r.success).length;
      const courseCategory = await createCourseCategory(config, successCount);

      setUploadResults(results);
      setStep('complete');

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  }, [config, onUploadComplete]);

  const handleBack = useCallback(() => {
    if (step === 'preview') {
      setStep('configure');
      setConfig(null);
      setRecords([]);
      setError(null);
    } else {
      onClose();
    }
  }, [step, onClose]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Batch Upload Personnel</h1>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900 text-2xl"
        >
          ✕
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-4">
        <StepIndicator step="configure" currentStep={step} label="Configure" />
        <div className="flex-1 h-1 bg-gray-200" />
        <StepIndicator step="preview" currentStep={step} label="Preview" />
        <div className="flex-1 h-1 bg-gray-200" />
        <StepIndicator step="uploading" currentStep={step} label="Upload" />
        <div className="flex-1 h-1 bg-gray-200" />
        <StepIndicator step="complete" currentStep={step} label="Complete" />
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      {step === 'configure' && (
        <BatchUploadForm onConfigSubmit={handleConfigSubmit} isLoading={isLoading} />
      )}

      {step === 'preview' && config && (
        <BatchPersonnelUploadTable
          config={config}
          records={records}
          onUpload={handleUpload}
          onBack={handleBack}
          isUploading={isLoading}
        />
      )}

      {(step === 'uploading' || step === 'complete') && (
        <UploadProgressSection
          step={step}
          results={uploadResults}
          isLoading={isLoading}
          config={config}
          onClose={onClose}
        />
      )}
    </div>
  );
}

interface StepIndicatorProps {
  step: UploadStep;
  currentStep: UploadStep;
  label: string;
}

function StepIndicator({ step, currentStep, label }: StepIndicatorProps) {
  const isActive = currentStep === step;
  const isComplete = ['configure', 'preview', 'uploading', 'complete'].indexOf(currentStep) > ['configure', 'preview', 'uploading', 'complete'].indexOf(step);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
          isComplete ? 'bg-green-600 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}
      >
        {isComplete ? <CheckCircle className="w-6 h-6" /> : step === 'configure' ? '1' : step === 'preview' ? '2' : step === 'uploading' ? '3' : '4'}
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}

interface UploadProgressSectionProps {
  step: UploadStep;
  results: BatchUploadResult[];
  isLoading: boolean;
  config: BatchUploadConfig | null;
  onClose: () => void;
}

function UploadProgressSection({
  step,
  results,
  isLoading,
  config,
  onClose,
}: UploadProgressSectionProps) {
  if (step === 'uploading' && isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900">Uploading Personnel Records</h2>
          <p className="text-gray-600">
            {results.length > 0 ? `${results.filter(r => r.success).length} of ${results.length} records uploaded` : 'Preparing upload...'}
          </p>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Complete!</h2>
          {config && (
            <p className="text-gray-600">
              Course {config.courseNumber} – {config.graduationYear} ({config.courseClassification})
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <p className="text-sm font-medium text-green-900">Successful Uploads</p>
            <p className="text-3xl font-bold text-green-600">{successCount}</p>
          </div>
          <div className={`rounded-lg border p-4 ${errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-sm font-medium ${errorCount > 0 ? 'text-red-900' : 'text-gray-900'}`}>
              Failed Uploads
            </p>
            <p className={`text-3xl font-bold ${errorCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {errorCount}
            </p>
          </div>
        </div>

        {/* Error Details */}
        {errorCount > 0 && (
          <div className="mb-8 bg-red-50 rounded-lg border border-red-200 p-4">
            <h3 className="font-semibold text-red-900 mb-3">Failed Records</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {results
                .filter(r => !r.success)
                .map((result, idx) => (
                  <div key={idx} className="text-sm text-red-700">
                    <span className="font-medium">{result.name}</span>: {result.error}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Next Steps</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Personnel records have been created with course information</li>
            <li>Records are automatically available in Directing Staff and Fellows sections</li>
            <li>You can upload images for personnel from the admin panel</li>
            <li>Edit individual records as needed</li>
          </ul>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return null;
}

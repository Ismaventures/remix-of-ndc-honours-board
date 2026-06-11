import { Category, Service } from './domain';

/**
 * Batch upload configuration
 * Specifies course classification, number, and graduation year
 */
export interface BatchUploadConfig {
  courseClassification: Category;
  courseNumber: number;
  graduationYear: number;
  description?: string;
  remarks?: string;
}

/**
 * Individual personnel record for batch upload
 * Can include image file reference
 */
export interface BatchPersonnelRecord {
  // Row identifier for tracking during upload
  rowIndex: number;
  
  // Required fields
  name: string;
  rank: string;
  service: Service;
  
  // Optional fields
  citation?: string;
  seniorityOrder?: number;
  imageFile?: File; // Image file to upload
  imageFileName?: string; // For reference/validation
  
  // Validation flags
  isValid?: boolean;
  validationErrors?: string[];
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  uploadError?: string;
}

/**
 * Batch upload session state
 * Tracks overall upload progress and results
 */
export interface BatchUploadSession {
  id: string;
  config: BatchUploadConfig;
  records: BatchPersonnelRecord[];
  totalRecords: number;
  successCount: number;
  errorCount: number;
  status: 'preparing' | 'validating' | 'uploading' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  errors: string[];
}

/**
 * Batch upload result for individual record
 */
export interface BatchUploadResult {
  recordIndex: number;
  personnelId: string;
  name: string;
  success: boolean;
  error?: string;
  imageUploadSuccess?: boolean;
  imageUploadError?: string;
}

/**
 * Course category generated from batch upload
 */
export interface GeneratedCourseCategory {
  courseNumber: number;
  graduationYear: number;
  courseClassification: Category;
  designation: string; // e.g., "Course 1 – 1986"
  generatedCourseId: string; // Format: "YEAR-COURSENUMBER"
  personnelCount: number;
  createdAt: Date;
}

/**
 * Batch upload constraints and limits
 */
export const BATCH_UPLOAD_CONSTRAINTS = {
  MAX_RECORDS_PER_UPLOAD: 500,
  MAX_IMAGE_SIZE_MB: 10,
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_CONCURRENT_UPLOADS: 5,
  SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  SUPPORTED_FILE_FORMATS: ['.csv', '.xlsx', '.xls'],
};

/**
 * CSV column mapping for flexible file formats
 */
export interface CSVColumnMapping {
  nameColumn: number | string;
  rankColumn: number | string;
  serviceColumn: number | string;
  citationColumn?: number | string;
  seniorityOrderColumn?: number | string;
  imageFileColumn?: number | string;
  headerRow: number;
}

/**
 * Default CSV column mapping
 */
export const DEFAULT_CSV_MAPPING: CSVColumnMapping = {
  nameColumn: 'A',
  rankColumn: 'B',
  serviceColumn: 'C',
  citationColumn: 'D',
  seniorityOrderColumn: 'E',
  imageFileColumn: 'F',
  headerRow: 1,
};

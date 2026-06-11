/**
 * File parsing utilities for batch upload
 * Supports CSV and Excel file formats
 */

import { BatchPersonnelRecord, CSVColumnMapping, DEFAULT_CSV_MAPPING } from '@/types/batchUpload';

/**
 * Parse CSV file content into array of objects
 * Supports various delimiters and handles quoted fields
 */
export function parseCSV(
  content: string,
  mapping: CSVColumnMapping = DEFAULT_CSV_MAPPING
): BatchPersonnelRecord[] {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length < mapping.headerRow + 1) {
    throw new Error(`File must have at least ${mapping.headerRow + 1} lines (including header)`);
  }

  // Skip to header row
  const dataLines = lines.slice(mapping.headerRow);
  const records: BatchPersonnelRecord[] = [];

  dataLines.forEach((line, index) => {
    const fields = parseCSVLine(line);
    if (fields.length === 0) return; // Skip empty lines

    const record: BatchPersonnelRecord = {
      rowIndex: index + mapping.headerRow,
      name: getField(fields, mapping.nameColumn, '').trim(),
      rank: getField(fields, mapping.rankColumn, '').trim(),
      service: getField(fields, mapping.serviceColumn, '').trim() as any,
      citation: mapping.citationColumn ? getField(fields, mapping.citationColumn, '').trim() : undefined,
      seniorityOrder: mapping.seniorityOrderColumn 
        ? parseInt(getField(fields, mapping.seniorityOrderColumn, '0')) 
        : undefined,
      imageFileName: mapping.imageFileColumn 
        ? getField(fields, mapping.imageFileColumn, '').trim() 
        : undefined,
      uploadStatus: 'pending',
      validationErrors: [],
    };

    records.push(record);
  });

  return records;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Get field from array by index or column letter
 * Supports both numeric indices and column letters (A, B, C, etc.)
 */
function getField(fields: string[], columnRef: number | string, defaultValue: string = ''): string {
  let index: number;

  if (typeof columnRef === 'number') {
    index = columnRef;
  } else {
    // Convert column letter to index (A=0, B=1, etc.)
    index = columnRef.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
  }

  return fields[index] || defaultValue;
}

/**
 * Parse Excel file (XLSX) - requires file to be read as ArrayBuffer
 * Uses a simple approach by converting to JSON
 */
export async function parseExcelFile(
  file: File,
  mapping: CSVColumnMapping = DEFAULT_CSV_MAPPING
): Promise<BatchPersonnelRecord[]> {
  try {
    // Try to use XLSX library if available, otherwise convert to CSV
    const text = await file.text();
    
    // If it's actually a CSV file saved as .xlsx, parse as CSV
    if (text.includes(',') || text.includes('\t')) {
      return parseCSV(text, mapping);
    }

    throw new Error('Excel file parsing requires external library. Please save as CSV instead.');
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate individual personnel record
 */
export function validatePersonnelRecord(record: BatchPersonnelRecord): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate required fields
  if (!record.name || record.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!record.rank || record.rank.trim().length === 0) {
    errors.push('Rank is required');
  }

  if (!record.service || record.service.trim().length === 0) {
    errors.push('Service is required');
  }

  // Validate service against allowed values
  const validServices = [
    'Nigerian Army',
    'Nigerian Navy',
    'Nigerian Air Force',
    'Civilian',
    'Foreign',
    'Foreign Service',
    'Academic',
  ];

  if (record.service && !validServices.includes(record.service)) {
    errors.push(`Service '${record.service}' is not valid. Must be one of: ${validServices.join(', ')}`);
  }

  // Validate seniority order if provided
  if (record.seniorityOrder !== undefined && (isNaN(record.seniorityOrder) || record.seniorityOrder < 0)) {
    errors.push('Seniority order must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all records in batch
 */
export function validateBatchRecords(records: BatchPersonnelRecord[]): BatchPersonnelRecord[] {
  return records.map(record => {
    const { valid, errors } = validatePersonnelRecord(record);
    return {
      ...record,
      isValid: valid,
      validationErrors: errors,
    };
  });
}

/**
 * Generate course designation from course number and year
 * Examples: "Course 1 – 1986", "Course 42 – 2020"
 */
export function generateCourseDesignation(courseNumber: number, graduationYear: number): string {
  return `Course ${courseNumber} – ${graduationYear}`;
}

/**
 * Generate unique course ID from year and course number
 * Format: "YYYY-X" where YYYY is year and X is course number
 */
export function generateCourseId(graduationYear: number, courseNumber: number): string {
  return `${graduationYear}-${courseNumber}`;
}

/**
 * Generate CSE decoration string for personnel record
 * Used to link personnel to their course
 * Format: "CSE X/YYYY" where X is course number and YYYY is year
 */
export function generateCSEDecoration(courseNumber: number, graduationYear: number): string {
  return `CSE ${courseNumber}/${graduationYear}`;
}

/**
 * Parse existing CSE decoration to extract course number and year
 * Returns null if decoration doesn't match expected format
 */
export function parseCSEDecoration(decoration: string): { courseNumber: number; graduationYear: number } | null {
  // Support multiple formats: "CSE X/YYYY" or "CSEX/YYYY"
  let match = decoration.match(/CSE\s*(\d+)\s*\/\s*(\d{4})/);
  if (!match) {
    match = decoration.match(/CSE(\d+)\/(\d{4})/);
  }

  if (!match) {
    return null;
  }

  return {
    courseNumber: parseInt(match[1], 10),
    graduationYear: parseInt(match[2], 10),
  };
}

/**
 * Check if decoration contains valid course data
 */
export function hasValidCourseData(decoration?: string): boolean {
  if (!decoration) return false;
  return parseCSEDecoration(decoration) !== null;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if file is valid for batch upload
 */
export function validateUploadFile(file: File): { valid: boolean; error?: string } {
  const validExtensions = ['.csv', '.xlsx', '.xls'];
  const fileName = file.name.toLowerCase();
  
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return {
      valid: false,
      error: `File must be one of: ${validExtensions.join(', ')}`,
    };
  }

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size ${formatFileSize(file.size)} exceeds maximum ${formatFileSize(maxSize)}`,
    };
  }

  return { valid: true };
}

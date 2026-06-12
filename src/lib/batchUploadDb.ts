/**
 * Database operations for batch uploads
 * Handles personnel creation, image uploads, and course category management
 */

import { createClient } from '@supabase/supabase-js';
import { BatchPersonnelRecord, BatchUploadConfig, BatchUploadResult, GeneratedCourseCategory } from '@/types/batchUpload';
import { Personnel } from '@/types/domain';
import { generateCSEDecoration, generateCourseId, generateCourseDesignation } from './batchUploadUtils';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload batch of personnel records to database
 * Returns array of results indicating success/failure for each record
 */
export async function uploadBatchPersonnel(
  config: BatchUploadConfig,
  records: BatchPersonnelRecord[]
): Promise<BatchUploadResult[]> {
  const results: BatchUploadResult[] = [];
  const cseDecoration = generateCSEDecoration(config.courseNumber, config.graduationYear);

  // Process records in parallel with concurrency limit
  const batchSize = 5; // Process 5 records at a time
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(record => uploadPersonnelRecord(config, record, cseDecoration))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Upload individual personnel record
 */
async function uploadPersonnelRecord(
  config: BatchUploadConfig,
  record: BatchPersonnelRecord,
  cseDecoration: string
): Promise<BatchUploadResult> {
  try {
    // Prepare personnel record
    const personnelData = {
      id: crypto.randomUUID(),
      name: record.name,
      rank: record.rank,
      category: config.courseClassification,
      service: record.service,
      period_start: config.graduationYear,
      period_end: config.graduationYear,
      citation: record.citation || '',
      decoration: cseDecoration,
      seniority_order: record.seniorityOrder || 0,
    };

    // Insert personnel record
    const { data, error } = await supabase
      .from('personnel')
      .insert([personnelData])
      .select('id')
      .single();

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    const personnelId = data.id;
    let imageUploadSuccess = true;
    let imageUploadError: string | undefined;

    // Upload image if provided
    if (record.imageFile) {
      try {
        imageUploadSuccess = await uploadPersonnelImage(personnelId, record.imageFile);
      } catch (imageError) {
        imageUploadSuccess = false;
        imageUploadError = imageError instanceof Error ? imageError.message : 'Image upload failed';
      }

      // Update personnel with image URL if upload succeeded
      if (imageUploadSuccess) {
        const imageUrl = getPersonnelImageUrl(personnelId, record.imageFile.name);
        await supabase
          .from('personnel')
          .update({ image_url: imageUrl })
          .eq('id', personnelId);
      }
    }

    return {
      recordIndex: record.rowIndex,
      personnelId,
      name: record.name,
      success: true,
      imageUploadSuccess,
      imageUploadError,
    };
  } catch (error) {
    return {
      recordIndex: record.rowIndex,
      personnelId: '',
      name: record.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload personnel image to Supabase storage
 * Returns true if upload successful
 */
async function uploadPersonnelImage(personnelId: string, file: File): Promise<boolean> {
  try {
    const fileName = `${personnelId}-${Date.now()}-${file.name}`;
    const filePath = `personnel/${fileName}`;

    const { error } = await supabase.storage
      .from('personnel-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate personnel image URL from storage
 */
function getPersonnelImageUrl(personnelId: string, fileName: string): string {
  const filePath = `personnel/${personnelId}-*-${fileName}`;
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/personnel-images`;
  return `${baseUrl}/${filePath}`;
}

/**
 * Create course category from batch upload configuration
 * Returns generated course category information
 */
export async function createCourseCategory(
  config: BatchUploadConfig,
  personnelCount: number
): Promise<GeneratedCourseCategory> {
  const courseId = generateCourseId(config.graduationYear, config.courseNumber);
  const designation = generateCourseDesignation(config.courseNumber, config.graduationYear);

  const category: GeneratedCourseCategory = {
    courseNumber: config.courseNumber,
    graduationYear: config.graduationYear,
    courseClassification: config.courseClassification,
    designation,
    generatedCourseId: courseId,
    personnelCount,
    createdAt: new Date(),
  };

  // This could be stored in a dedicated table for course history/metadata
  // For now, the course is implicitly created through personnel records with proper decoration

  return category;
}

/**
 * Fetch personnel by course to verify batch upload
 */
export async function fetchPersonnelByCourse(
  courseNumber: number,
  graduationYear: number
): Promise<Personnel[]> {
  const { data, error } = await supabase
    .from('personnel')
    .select('*')
    .like('decoration', `CSE ${courseNumber}/%${graduationYear}%`)
    .order('seniority_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch personnel: ${error.message}`);
  }

  // Transform database records to Personnel type
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    rank: row.rank,
    category: row.category,
    service: row.service,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    imageUrl: row.image_url,
    citation: row.citation,
    decoration: row.decoration,
    seniorityOrder: row.seniority_order || 0,
  }));
}

/**
 * Get all available courses from personnel records
 * Extracts unique courses from CSE decorations
 */
export async function getAvailableCourses(): Promise<GeneratedCourseCategory[]> {
  const { data, error } = await supabase
    .from('personnel')
    .select('decoration, category')
    .not('decoration', 'is', null)
    .order('decoration');

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  const courseMap = new Map<string, GeneratedCourseCategory>();

  (data || []).forEach(row => {
    if (!row.decoration) return;

    // Parse CSE decoration
    let match = row.decoration.match(/CSE\s*(\d+)\s*\/\s*(\d{4})/);
    if (!match) {
      const altMatch = row.decoration.match(/CSE(\d+)\/(\d{4})/);
      if (!altMatch) return;
      match = altMatch;
    }

    const courseNumber = parseInt(match[1], 10);
    const graduationYear = parseInt(match[2], 10);
    const courseId = generateCourseId(graduationYear, courseNumber);

    if (!courseMap.has(courseId)) {
      courseMap.set(courseId, {
        courseNumber,
        graduationYear,
        courseClassification: row.category,
        designation: generateCourseDesignation(courseNumber, graduationYear),
        generatedCourseId: courseId,
        personnelCount: 0,
        createdAt: new Date(),
      });
    }

    const course = courseMap.get(courseId)!;
    course.personnelCount++;
  });

  return Array.from(courseMap.values()).sort((a, b) => {
    // Sort by year descending, then by course number
    if (a.graduationYear !== b.graduationYear) {
      return b.graduationYear - a.graduationYear;
    }
    return a.courseNumber - b.courseNumber;
  });
}

/**
 * Delete batch upload course and all associated personnel
 * Use with caution - this is permanent
 */
export async function deleteBatchUploadCourse(
  courseNumber: number,
  graduationYear: number
): Promise<boolean> {
  try {
    const cseDecoration = generateCSEDecoration(courseNumber, graduationYear);

    // First, get all personnel to delete their images
    const { data: personnel, error: fetchError } = await supabase
      .from('personnel')
      .select('id, image_url')
      .eq('decoration', cseDecoration);

    if (fetchError) {
      throw fetchError;
    }

    // Delete images from storage
    for (const person of personnel || []) {
      if (person.image_url) {
        try {
          await supabase.storage
            .from('personnel-images')
            .remove([`personnel/${person.id}`]);
        } catch (e) {
          console.warn(`Failed to delete image for ${person.id}:`, e);
        }
      }
    }

    // Delete personnel records
    const { error: deleteError } = await supabase
      .from('personnel')
      .delete()
      .eq('decoration', cseDecoration);

    if (deleteError) {
      throw deleteError;
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to delete course: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export personnel by course as CSV
 */
export function exportPersonnelToCSV(personnel: Personnel[]): string {
  const headers = ['Name', 'Rank', 'Service', 'Citation', 'Category', 'Period Start', 'Period End'];
  const rows = personnel.map(p => [
    p.name,
    p.rank,
    p.service,
    p.citation,
    p.category,
    p.periodStart.toString(),
    p.periodEnd.toString(),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}

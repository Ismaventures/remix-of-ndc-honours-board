import { Personnel } from '@/types/domain';

/**
 * Find all personnel records with the same name (same person in different categories)
 */
export function findRelatedPersonnel(
  allPersonnel: Personnel[],
  targetPerson: Personnel
): Personnel[] {
  return allPersonnel.filter(p =>
    p.name.toLowerCase() === targetPerson.name.toLowerCase() &&
    p.id !== targetPerson.id
  );
}

/**
 * Get all unique names in the personnel list with their category count
 */
export function getPersonnelProfiles(allPersonnel: Personnel[]): {
  name: string;
  categories: string[];
  count: number;
  representative: Personnel; // The first person with this name
}[] {
  const profileMap = new Map<
    string,
    { categories: Set<string>; representative: Personnel }
  >();

  allPersonnel.forEach(p => {
    const key = p.name.toLowerCase();
    if (!profileMap.has(key)) {
      profileMap.set(key, { categories: new Set(), representative: p });
    }
    const profile = profileMap.get(key)!;
    profile.categories.add(p.category);
  });

  return Array.from(profileMap.entries()).map(([name, data]) => ({
    name,
    categories: Array.from(data.categories),
    count: data.categories.size,
    representative: data.representative,
  }));
}

/**
 * Check if a person has multiple categories
 */
export function hasMultipleCategories(
  allPersonnel: Personnel[],
  person: Personnel
): boolean {
  const related = findRelatedPersonnel(allPersonnel, person);
  return related.length > 0;
}

/**
 * Get all categories a person belongs to
 */
export function getPersonCategories(
  allPersonnel: Personnel[],
  name: string
): string[] {
  return Array.from(
    new Set(
      allPersonnel
        .filter(p => p.name.toLowerCase() === name.toLowerCase())
        .map(p => p.category)
    )
  );
}

/**
 * Sync a field across all instances of a person
 * Returns object with { personId: fieldValue } for all affected records
 */
export function getSyncUpdates(
  allPersonnel: Personnel[],
  sourcePerson: Personnel,
  field: keyof Personnel,
  value: any
): { [personId: string]: any } {
  const relatedPersonnel = findRelatedPersonnel(allPersonnel, sourcePerson);
  const updates: { [personId: string]: any } = {
    [sourcePerson.id]: value,
  };

  relatedPersonnel.forEach(person => {
    updates[person.id] = value;
  });

  return updates;
}

/**
 * Get all personnel updates needed when syncing image across categories
 */
export function getImageSyncUpdates(
  allPersonnel: Personnel[],
  sourcePerson: Personnel,
  imageUrl: string
): { [personId: string]: string } {
  return getSyncUpdates(allPersonnel, sourcePerson, 'imageUrl', imageUrl);
}

/**
 * Prevent duplicate categories for same person
 * Returns true if person already has this category
 */
export function hasCategoryDuplicate(
  allPersonnel: Personnel[],
  name: string,
  category: string
): boolean {
  return allPersonnel.some(
    p =>
      p.name.toLowerCase() === name.toLowerCase() &&
      p.category === category
  );
}

/**
 * Get course info from decoration field
 * Format: "CSE 28/2019" or "28/2019"
 */
export function parseCourseFromDecoration(
  decoration?: string
): { courseNumber: number; year: number } | null {
  if (!decoration) return null;

  // Try "CSE 28/2019" format
  let match = decoration.match(/CSE\s*(\d+)\s*\/\s*(\d{4})/);
  if (match) {
    return { courseNumber: parseInt(match[1], 10), year: parseInt(match[2], 10) };
  }

  // Try "28/2019" format
  match = decoration.match(/(\d+)\s*\/\s*(\d{4})/);
  if (match) {
    return { courseNumber: parseInt(match[1], 10), year: parseInt(match[2], 10) };
  }

  return null;
}

/**
 * Check if two personnel belong to the same course
 */
export function belongToSameCourse(
  person1: Personnel,
  person2: Personnel
): boolean {
  const course1 = parseCourseFromDecoration(person1.decoration);
  const course2 = parseCourseFromDecoration(person2.decoration);

  if (!course1 || !course2) return false;

  return course1.courseNumber === course2.courseNumber &&
         course1.year === course2.year;
}

/**
 * Get all personnel on the same course as given person
 */
export function getPersonnelOnSameCourse(
  allPersonnel: Personnel[],
  person: Personnel
): Personnel[] {
  return allPersonnel.filter(p =>
    p.id !== person.id && belongToSameCourse(p, person)
  );
}

/**
 * Prevent duplicate categories on the same course for the same person
 * Returns error message if duplicate exists, null if OK
 */
export function validateNoCategoryDuplicateOnCourse(
  allPersonnel: Personnel[],
  name: string,
  category: string,
  courseDecoration: string
): string | null {
  const existing = allPersonnel.find(p =>
    p.name.toLowerCase() === name.toLowerCase() &&
    p.category === category &&
    p.decoration === courseDecoration
  );

  if (existing) {
    return `${name} already has ${category} role on this course`;
  }

  return null;
}

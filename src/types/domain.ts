export type Category = 'FWC' | 'FDC' | 'Directing Staff' | 'Allied' | 'fwc+' | 'fdc+' | 'Staff' | 'Participants' | 'Faculty' | 'Directorate';
export type MuseumLinkedView =
  | 'home'
  | 'about-ndc'
  | 'museum-collections'
  | 'guided-tours'
  | 'hall-of-fame'
  | 'commandants'
  | 'faculty'
  | 'participants'
  | 'directorate'
  | 'allied'
  | 'visits';

export type Service =
  | 'Nigerian Army'
  | 'Nigerian Navy'
  | 'Nigerian Air Force'
  | 'Civilian'
  | 'Foreign'
  | 'Foreign Service'
  | 'Academic';

// Export valid values for dropdowns and validation
export const VALID_CATEGORIES: Category[] = ['FWC', 'FDC', 'Directing Staff', 'Allied'];
export const VALID_SERVICES: Service[] = ['Nigerian Army', 'Nigerian Navy', 'Nigerian Air Force', 'Civilian', 'Foreign', 'Foreign Service', 'Academic'];

export interface Personnel {
  id: string;
  name: string;
  rank: string;
  category: Category;
  service: Service;
  course?: number;
  academicYear?: string;
  periodStart: number;
  periodEnd: number;
  imageUrl?: string;
  citation: string;
  decoration?: string;
  biographyFull?: string;
  seniorityOrder: number;
}

export interface Commandant {
  id: string;
  name: string;
  rank?: string;
  title: string;
  postNominals?: string;
  tenureStart: number;
  tenureEnd: number | null;
  yearsExperience?: number;
  imageUrl?: string;
  description: string;
  bioSummary?: string;
  biographyFull?: string;
  education?: string[];
  training?: string[];
  pastAppointments?: string[];
  honours?: string[];
  familyNote?: string;
  impactStatement?: string;
  decoration?: string;
  isCurrent: boolean;
}

export interface DistinguishedVisit {
  id: string;
  name: string;
  title: string;
  country: string;
  date: string;
  imageUrl?: string;
  description: string;
  decoration?: string;
}

export interface MuseumArtifact {
  id: string;
  name: string;
  description: string;
  era: string;
  origin: string;
  strategicSignificance: string;
  mediaUrls: string[];
  tags?: string[];
  relatedArtifactIds?: string[];
  galleryCategory?: string;
  periodLabel?: string;
  mapLat?: number;
  mapLng?: number;
  mapZoom?: number;
  linkedView?: MuseumLinkedView;
  linkedRecordId?: string;
}

export interface MuseumTourStep {
  id: string;
  tourId: string;
  stepOrder: number;
  title: string;
  narrationText: string;
  artifactId?: string;
  artifact?: MuseumArtifact | null;
  audioTrackId?: string;
  audioUrl?: string;
  durationSec?: number;
  autoAdvance?: boolean;
  languageCode?: string;
  mapLat?: number;
  mapLng?: number;
  mapZoom?: number;
  linkedView?: MuseumLinkedView;
  linkedRecordId?: string;
}

export interface MuseumTour {
  id: string;
  name: string;
  description: string;
  durationEstimateMinutes?: number;
  coverImageUrl?: string;
  theme?: string;
  languageCode?: string;
  autoModeEnabled?: boolean;
  steps: MuseumTourStep[];
}
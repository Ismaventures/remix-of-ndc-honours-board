export type Category = 'FWC' | 'FDC' | 'Directing Staff' | 'Allied' | 'fwc+' | 'fdc+' | 'Staff';
export type Service =
  | 'Nigerian Army'
  | 'Nigerian Navy'
  | 'Nigerian Air Force'
  | 'Civilian'
  | 'Foreign'
  | 'Foreign Service'
  | 'Academic';

export interface Personnel {
  id: string;
  name: string;
  rank: string;
  category: Category;
  service: Service;
  periodStart: number;
  periodEnd: number;
  imageUrl?: string;
  citation: string;
  decoration?: string;
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
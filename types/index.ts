export type RecordCategory = 'protocol' | 'medication' | 'maneuver' | 'equipment';
export type SeverityLevel = 'routine' | 'urgent' | 'critical';
export type CertificationLevel = 'all' | 'bls' | 'als' | 'olmc';

export interface MedicalSpecs {
  organization?: string;
  echelon?: string; // 'BLS', 'ALS', 'OLMC', 'Tous'
  operationalStatus?: string;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

export interface WikiRecord {
  id: string;
  slug: string;
  title: string;
  category: RecordCategory;
  severity?: SeverityLevel;
  summary: string;
  content: string;
  tags: string[];
  media: MediaItem[];
  specs?: MedicalSpecs;
  updatedAt: string;
}

export interface SearchResult {
  record: WikiRecord;
  snippet: string;
  matchField: string;
}

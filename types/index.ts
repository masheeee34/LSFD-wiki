export type RecordCategory = 'protocol' | 'medication' | 'maneuver' | 'equipment';
export type SeverityLevel = 'routine' | 'urgent' | 'critical';

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
  updatedAt: string;
}

export interface SearchResult {
  record: WikiRecord;
  snippet: string;
  matchField: string;
}

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { WikiRecord, SearchResult } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'records.json');

function readRecords(): WikiRecord[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as WikiRecord[];
  } catch {
    return [];
  }
}

function writeRecords(records: WikiRecord[]): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

export async function getAll(): Promise<WikiRecord[]> {
  return readRecords();
}

export async function getBySlug(slug: string): Promise<WikiRecord | undefined> {
  return readRecords().find((r) => r.slug === slug);
}

export async function getById(id: string): Promise<WikiRecord | undefined> {
  return readRecords().find((r) => r.id === id);
}

export async function create(data: Omit<WikiRecord, 'id' | 'updatedAt'>): Promise<WikiRecord> {
  const records = readRecords();
  const record: WikiRecord = {
    ...data,
    id: uuidv4(),
    updatedAt: new Date().toISOString(),
  };
  records.push(record);
  writeRecords(records);
  return record;
}

export async function update(id: string, data: Partial<Omit<WikiRecord, 'id'>>): Promise<WikiRecord | null> {
  const records = readRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...data, id, updatedAt: new Date().toISOString() };
  writeRecords(records);
  return records[idx];
}

export async function remove(id: string): Promise<boolean> {
  const records = readRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  records.splice(idx, 1);
  writeRecords(records);
  return true;
}

function extractSnippet(text: string, query: string, windowSize = 120): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, windowSize) + '…';
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + windowSize - 40);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

export async function search(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const records = readRecords();
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const record of records) {
    const fields: Array<{ key: string; value: string }> = [
      { key: 'title', value: record.title },
      { key: 'summary', value: record.summary },
      { key: 'content', value: record.content },
      { key: 'tags', value: record.tags.join(' ') },
      { key: 'category', value: record.category },
    ];

    for (const { key, value } of fields) {
      if (value.toLowerCase().includes(q)) {
        results.push({
          record,
          snippet: extractSnippet(value, query),
          matchField: key,
        });
        break;
      }
    }
  }

  return results;
}

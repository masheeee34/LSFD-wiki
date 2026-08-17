import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import type { WikiRecord, SearchResult } from '@/types';
import defaultRecords from '@/data/records.json';

declare global {
  // eslint-disable-next-line no-var
  var __lsfd_records_store: WikiRecord[] | undefined;
}

const LOCAL_DATA_FILE = path.join(process.cwd(), 'data', 'records.json');
const TMP_DATA_FILE = path.join(os.tmpdir(), 'lsfd-records.json');

function initStore(): WikiRecord[] {
  if (globalThis.__lsfd_records_store && Array.isArray(globalThis.__lsfd_records_store)) {
    return globalThis.__lsfd_records_store;
  }

  // 1. Try reading from /tmp/lsfd-records.json
  try {
    if (fs.existsSync(TMP_DATA_FILE)) {
      const raw = fs.readFileSync(TMP_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as WikiRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalThis.__lsfd_records_store = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read from tmp store:', e);
  }

  // 2. Try reading from local data file
  try {
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as WikiRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalThis.__lsfd_records_store = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read from local file:', e);
  }

  // 3. Fallback to bundled JSON
  const initial = Array.isArray(defaultRecords) ? [...(defaultRecords as WikiRecord[])] : [];
  globalThis.__lsfd_records_store = initial;
  return initial;
}

function writeRecords(records: WikiRecord[]): void {
  globalThis.__lsfd_records_store = records;

  // Attempt to persist to /tmp (always writable in Netlify / Lambda / Linux)
  try {
    fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write to tmp store:', e);
  }

  // Attempt to persist to local file if writable
  try {
    const dir = path.dirname(LOCAL_DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch {
    // Silently ignore EROFS in read-only serverless environments
  }
}

export async function getAll(): Promise<WikiRecord[]> {
  return initStore();
}

export async function getBySlug(slug: string): Promise<WikiRecord | undefined> {
  return initStore().find((r) => r.slug === slug || r.id === slug);
}

export async function getById(id: string): Promise<WikiRecord | undefined> {
  return initStore().find((r) => r.id === id || r.slug === id);
}

export async function create(data: Omit<WikiRecord, 'id' | 'updatedAt'>): Promise<WikiRecord> {
  const records = [...initStore()];
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
  const records = [...initStore()];
  const idx = records.findIndex((r) => r.id === id || r.slug === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...data, id: records[idx].id, updatedAt: new Date().toISOString() };
  writeRecords(records);
  return records[idx];
}

export async function remove(idOrSlug: string): Promise<boolean> {
  const records = [...initStore()];
  const idx = records.findIndex((r) => r.id === idOrSlug || r.slug === idOrSlug);
  if (idx !== -1) {
    records.splice(idx, 1);
    writeRecords(records);
  }
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
  const records = initStore();
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

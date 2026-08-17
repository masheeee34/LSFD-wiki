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

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'masheeee34/LSFD-wiki';

// Remote Redis fetch helper
async function fetchRemoteRedis(): Promise<WikiRecord[] | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const res = await fetch(`${UPSTASH_URL}/get/lsfd_records`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { result?: string };
    if (data.result) {
      const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      if (Array.isArray(parsed)) return parsed as WikiRecord[];
    }
  } catch {}
  return null;
}

// Remote Redis save helper
async function saveRemoteRedis(records: WikiRecord[]): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return false;
  try {
    const res = await fetch(`${UPSTASH_URL}/set/lsfd_records`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JSON.stringify(records)),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Remote GitHub Fetch helper (reads live data directly from repo)
async function fetchFromGitHub(): Promise<WikiRecord[] | null> {
  if (!GITHUB_TOKEN) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/records.json`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LSFD-Wiki-App',
      },
    });

    if (!res.ok) return null;
    const data = await res.json() as { content?: string; encoding?: string };
    if (data.content) {
      const raw = Buffer.from(data.content, 'base64').toString('utf-8');
      const parsed = JSON.parse(raw) as WikiRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

// Remote GitHub Commit helper (Auto-commits to GitHub repo)
async function commitToGitHub(records: WikiRecord[]): Promise<boolean> {
  if (!GITHUB_TOKEN) return false;
  try {
    // 1. Get current file SHA
    const fileRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/records.json`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LSFD-Wiki-App',
      },
    });

    let sha: string | undefined;
    if (fileRes.ok) {
      const fileData = await fileRes.json() as { sha?: string };
      sha = fileData.sha;
    }

    // 2. Commit updated JSON
    const contentBase64 = Buffer.from(JSON.stringify(records, null, 2), 'utf-8').toString('base64');
    const updateRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/records.json`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LSFD-Wiki-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'chore(wiki): auto-sync records from admin portal',
        content: contentBase64,
        sha,
      }),
    });

    return updateRes.ok;
  } catch {
    return false;
  }
}

function loadLocalStore(): WikiRecord[] {
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
  } catch {}

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
  } catch {}

  // 3. Fallback to bundled JSON
  const initial = Array.isArray(defaultRecords) ? [...(defaultRecords as WikiRecord[])] : [];
  globalThis.__lsfd_records_store = initial;
  return initial;
}

function persistLocalStore(records: WikiRecord[]): void {
  globalThis.__lsfd_records_store = records;

  // Persist to /tmp (always writable in serverless)
  try {
    fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch {}

  // Persist to local disk if writable
  try {
    const dir = path.dirname(LOCAL_DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch {}
}

export async function getAll(): Promise<WikiRecord[]> {
  const remoteRedis = await fetchRemoteRedis();
  if (remoteRedis) {
    globalThis.__lsfd_records_store = remoteRedis;
    return remoteRedis;
  }

  const remoteGH = await fetchFromGitHub();
  if (remoteGH) {
    globalThis.__lsfd_records_store = remoteGH;
    return remoteGH;
  }

  return loadLocalStore();
}

export async function getBySlug(slug: string): Promise<WikiRecord | undefined> {
  const records = await getAll();
  return records.find((r) => r.slug === slug || r.id === slug);
}

export async function getById(id: string): Promise<WikiRecord | undefined> {
  const records = await getAll();
  return records.find((r) => r.id === id || r.slug === id);
}

export async function create(data: Omit<WikiRecord, 'id' | 'updatedAt'>): Promise<WikiRecord> {
  const records = [...(await getAll())];
  const record: WikiRecord = {
    ...data,
    id: uuidv4(),
    updatedAt: new Date().toISOString(),
  };
  records.push(record);
  persistLocalStore(records);
  await saveRemoteRedis(records);
  await commitToGitHub(records).catch(() => {});
  return record;
}

export async function update(id: string, data: Partial<Omit<WikiRecord, 'id'>>): Promise<WikiRecord | null> {
  const records = [...(await getAll())];
  const idx = records.findIndex((r) => r.id === id || r.slug === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...data, id: records[idx].id, updatedAt: new Date().toISOString() };
  persistLocalStore(records);
  await saveRemoteRedis(records);
  await commitToGitHub(records).catch(() => {});
  return records[idx];
}

export async function remove(idOrSlug: string): Promise<boolean> {
  const records = [...(await getAll())];
  const idx = records.findIndex((r) => r.id === idOrSlug || r.slug === idOrSlug);
  if (idx !== -1) {
    records.splice(idx, 1);
    persistLocalStore(records);
    await saveRemoteRedis(records);
    await commitToGitHub(records).catch(() => {});
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
  const records = await getAll();
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

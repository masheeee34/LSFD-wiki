import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import type { WikiRecord, InterventionPack, SearchResult } from '@/types';
import defaultRecords from '@/data/records.json';
import defaultPacks from '@/data/packs.json';

declare global {
  // eslint-disable-next-line no-var
  var __lsfd_records_store: WikiRecord[] | undefined;
  // eslint-disable-next-line no-var
  var __lsfd_packs_store: InterventionPack[] | undefined;
}

const LOCAL_DATA_FILE = path.join(process.cwd(), 'data', 'records.json');
const LOCAL_PACKS_FILE = path.join(process.cwd(), 'data', 'packs.json');
const TMP_DATA_FILE = path.join(os.tmpdir(), 'lsfd-records.json');
const TMP_PACKS_FILE = path.join(os.tmpdir(), 'lsfd-packs.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'masheeee34/LSFD-wiki';

// Helper to remove accents for fuzzy French search
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// ----------------------------------------------------
// RECORDS STORE (0ms local NVMe SSD & Memory)
// ----------------------------------------------------
function loadLocalStore(): WikiRecord[] {
  if (globalThis.__lsfd_records_store !== undefined) {
    return globalThis.__lsfd_records_store;
  }

  try {
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as WikiRecord[];
      if (Array.isArray(parsed)) {
        globalThis.__lsfd_records_store = parsed;
        return parsed;
      }
    }
  } catch {}

  try {
    if (fs.existsSync(TMP_DATA_FILE)) {
      const raw = fs.readFileSync(TMP_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as WikiRecord[];
      if (Array.isArray(parsed)) {
        globalThis.__lsfd_records_store = parsed;
        return parsed;
      }
    }
  } catch {}

  const initial = Array.isArray(defaultRecords) ? [...(defaultRecords as WikiRecord[])] : [];
  globalThis.__lsfd_records_store = initial;
  return initial;
}

function persistLocalStore(records: WikiRecord[]): void {
  globalThis.__lsfd_records_store = records;
  try {
    const dir = path.dirname(LOCAL_DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch {}
  try {
    fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch {}
}

// ----------------------------------------------------
// PACKS STORE (0ms local NVMe SSD & Memory)
// ----------------------------------------------------
function loadLocalPacks(): InterventionPack[] {
  if (globalThis.__lsfd_packs_store !== undefined) {
    return globalThis.__lsfd_packs_store;
  }

  try {
    if (fs.existsSync(LOCAL_PACKS_FILE)) {
      const raw = fs.readFileSync(LOCAL_PACKS_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as InterventionPack[];
      if (Array.isArray(parsed)) {
        globalThis.__lsfd_packs_store = parsed;
        return parsed;
      }
    }
  } catch {}

  try {
    if (fs.existsSync(TMP_PACKS_FILE)) {
      const raw = fs.readFileSync(TMP_PACKS_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as InterventionPack[];
      if (Array.isArray(parsed)) {
        globalThis.__lsfd_packs_store = parsed;
        return parsed;
      }
    }
  } catch {}

  const initial = Array.isArray(defaultPacks) ? [...(defaultPacks as InterventionPack[])] : [];
  globalThis.__lsfd_packs_store = initial;
  return initial;
}

function persistLocalPacks(packs: InterventionPack[]): void {
  globalThis.__lsfd_packs_store = packs;
  try {
    const dir = path.dirname(LOCAL_PACKS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_PACKS_FILE, JSON.stringify(packs, null, 2), 'utf-8');
  } catch {}
  try {
    fs.writeFileSync(TMP_PACKS_FILE, JSON.stringify(packs, null, 2), 'utf-8');
  } catch {}
}

// Background async GitHub Commit helper
async function commitToGitHubAsync(filePath: string, contentJson: unknown, commitMsg: string): Promise<boolean> {
  if (!GITHUB_TOKEN) return false;
  try {
    const fileRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?t=${Date.now()}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LSFD-Wiki-App',
      },
      cache: 'no-store',
    });

    let sha: string | undefined;
    if (fileRes.ok) {
      const fileData = await fileRes.json() as { sha?: string };
      sha = fileData.sha;
    }

    const contentBase64 = Buffer.from(JSON.stringify(contentJson, null, 2), 'utf-8').toString('base64');
    const updateRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LSFD-Wiki-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMsg,
        content: contentBase64,
        sha,
      }),
      cache: 'no-store',
    });

    return updateRes.ok;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// RECORDS API
// ----------------------------------------------------
export async function getAll(): Promise<WikiRecord[]> {
  return loadLocalStore();
}

export async function getBySlug(slug: string): Promise<WikiRecord | undefined> {
  const records = await getAll();
  const normSlug = normalizeText(slug);
  return records.find((r) => r.slug === slug || r.id === slug || normalizeText(r.slug) === normSlug);
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

  commitToGitHubAsync('data/records.json', records, 'chore(wiki): auto-sync records').catch(() => {});
  return record;
}

export async function update(id: string, data: Partial<Omit<WikiRecord, 'id'>>): Promise<WikiRecord | null> {
  const records = [...(await getAll())];
  const idx = records.findIndex((r) => r.id === id || r.slug === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...data, id: records[idx].id, updatedAt: new Date().toISOString() };
  persistLocalStore(records);

  commitToGitHubAsync('data/records.json', records, 'chore(wiki): auto-sync update record').catch(() => {});
  return records[idx];
}

export async function remove(idOrSlug: string): Promise<boolean> {
  const records = [...(await getAll())];
  const idx = records.findIndex((r) => r.id === idOrSlug || r.slug === idOrSlug);
  if (idx !== -1) {
    records.splice(idx, 1);
    persistLocalStore(records);

    commitToGitHubAsync('data/records.json', records, 'chore(wiki): auto-sync delete record').catch(() => {});
  }
  return true;
}

// ----------------------------------------------------
// PACKS API (Robust Delete & CRUD)
// ----------------------------------------------------
export async function getPacks(): Promise<InterventionPack[]> {
  return loadLocalPacks();
}

export async function getPackBySlug(slug: string): Promise<InterventionPack | undefined> {
  const packs = await getPacks();
  const normSlug = normalizeText(slug);
  return packs.find((p) => p.slug === slug || p.id === slug || normalizeText(p.slug) === normSlug);
}

export async function getPackById(id: string): Promise<InterventionPack | undefined> {
  const packs = await getPacks();
  return packs.find((p) => p.id === id || p.slug === id);
}

export async function createPack(data: Omit<InterventionPack, 'id' | 'updatedAt'>): Promise<InterventionPack> {
  const packs = [...(await getPacks())];
  const pack: InterventionPack = {
    ...data,
    id: `pack-${uuidv4().slice(0, 8)}`,
    updatedAt: new Date().toISOString(),
  };
  packs.push(pack);
  persistLocalPacks(packs);

  commitToGitHubAsync('data/packs.json', packs, 'chore(packs): auto-sync create pack').catch(() => {});
  return pack;
}

export async function updatePack(id: string, data: Partial<Omit<InterventionPack, 'id'>>): Promise<InterventionPack | null> {
  const packs = [...(await getPacks())];
  const idx = packs.findIndex((p) => p.id === id || p.slug === id);
  if (idx === -1) return null;
  packs[idx] = { ...packs[idx], ...data, id: packs[idx].id, updatedAt: new Date().toISOString() };
  persistLocalPacks(packs);

  commitToGitHubAsync('data/packs.json', packs, 'chore(packs): auto-sync update pack').catch(() => {});
  return packs[idx];
}

export async function removePack(idOrSlug: string): Promise<boolean> {
  const packs = [...(await getPacks())];
  const norm = normalizeText(idOrSlug);
  const idx = packs.findIndex((p) => p.id === idOrSlug || p.slug === idOrSlug || normalizeText(p.slug) === norm);
  
  if (idx !== -1) {
    packs.splice(idx, 1);
    persistLocalPacks(packs);
    commitToGitHubAsync('data/packs.json', packs, 'chore(packs): auto-sync delete pack').catch(() => {});
    return true;
  }
  return false;
}

// ----------------------------------------------------
// GLOBAL DEFINITIONS DICTIONARY
// ----------------------------------------------------
export async function getGlobalDictionary(): Promise<Record<string, string>> {
  const records = await getAll();
  const dict: Record<string, string> = {};

  // Scan all markdown content across all records for custom [[def:explication|mot]]
  const defRegex = /\[\[def:([^|\]]+)\|([^\]]+)\]\]/g;
  for (const r of records) {
    if (!r.content) continue;
    let match;
    while ((match = defRegex.exec(r.content)) !== null) {
      const explanation = match[1].trim();
      const word = match[2].trim();
      if (word && explanation) {
        dict[word] = explanation;
      }
    }
  }

  return dict;
}

// ----------------------------------------------------
// SEARCH
// ----------------------------------------------------
function extractSnippet(text: string, query: string, windowSize = 120): string {
  const normText = normalizeText(text);
  const normQuery = normalizeText(query);
  const idx = normText.indexOf(normQuery);
  if (idx === -1) return text.slice(0, windowSize) + (text.length > windowSize ? '…' : '');
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + windowSize - 30);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

export async function search(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const records = await getAll();
  const qNorm = normalizeText(query);
  const results: SearchResult[] = [];

  for (const record of records) {
    const fields: Array<{ key: string; value: string }> = [
      { key: 'title', value: record.title || '' },
      { key: 'slug', value: record.slug || '' },
      { key: 'summary', value: record.summary || '' },
      { key: 'content', value: record.content || '' },
      { key: 'tags', value: (record.tags || []).join(' ') },
      { key: 'category', value: record.category || '' },
    ];

    for (const { key, value } of fields) {
      if (value && normalizeText(value).includes(qNorm)) {
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

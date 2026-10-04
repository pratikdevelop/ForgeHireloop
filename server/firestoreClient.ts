import appletConfig from '../firebase-applet-config.json';
import { User, Company, Job, Application, PlatformCategory, FlaggedContent, JobAlert, Message } from './types';

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || 'forgehireloop';
const API_KEY = process.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || 'AIzaSyA_LdK4DgIIQdWC1efYAPj1ltkbxwBEB0o';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Transforms JavaScript object to Firestore REST API fields structure
 */
function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

function toFirestoreValue(val: any): any {
  if (val === null) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((v) => toFirestoreValue(v)),
      },
    };
  }
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: toFirestoreFields(val),
      },
    };
  }
  return { stringValue: String(val) };
}

/**
 * Parses Firestore REST API document format to clean JS object
 */
function fromFirestoreDoc<T = any>(doc: any): T {
  const result: any = {};
  if (!doc) return result;
  const segments = doc.name ? doc.name.split('/') : [];
  result.id = segments[segments.length - 1];

  if (doc.fields) {
    for (const [key, value] of Object.entries(doc.fields)) {
      result[key] = fromFirestoreValue(value);
    }
  }
  return result as T;
}

function fromFirestoreValue(val: any): any {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const list = val.arrayValue.values || [];
    return list.map((item: any) => fromFirestoreValue(item));
  }
  if ('mapValue' in val) {
    const fields = val.mapValue.fields || {};
    const res: any = {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = fromFirestoreValue(v);
    }
    return res;
  }
  return null;
}

export const firestoreRest = {
  async getDocument<T = any>(collection: string, docId: string): Promise<T | null> {
    try {
      const url = `${FIRESTORE_BASE}/${collection}/${encodeURIComponent(docId)}?key=${API_KEY}`;
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) {
        console.warn(`[Firestore REST] GET ${collection}/${docId} returned status ${res.status}`);
        return null;
      }
      const data = await res.json();
      return fromFirestoreDoc<T>(data);
    } catch (e) {
      console.error(`[Firestore REST] Failed GET ${collection}/${docId}:`, e);
      return null;
    }
  },

  async listDocuments<T = any>(collection: string, pageSize = 300): Promise<T[]> {
    try {
      const url = `${FIRESTORE_BASE}/${collection}?pageSize=${pageSize}&key=${API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[Firestore REST] LIST ${collection} returned status ${res.status}`);
        return [];
      }
      const data = await res.json();
      if (!data.documents || !Array.isArray(data.documents)) return [];
      return data.documents.map((d: any) => fromFirestoreDoc<T>(d));
    } catch (e) {
      console.error(`[Firestore REST] Failed LIST ${collection}:`, e);
      return [];
    }
  },

  async setDocument<T extends { id: string }>(collection: string, docId: string, data: Partial<T>): Promise<T> {
    const payload = {
      fields: toFirestoreFields(data),
    };
    const url = `${FIRESTORE_BASE}/${collection}/${encodeURIComponent(docId)}?key=${API_KEY}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[Firestore REST] PATCH ${collection}/${docId} failed (${res.status}): ${errText}`);
    }
    const saved = await res.json();
    return fromFirestoreDoc<T>(saved);
  },

  async deleteDocument(collection: string, docId: string): Promise<boolean> {
    const url = `${FIRESTORE_BASE}/${collection}/${encodeURIComponent(docId)}?key=${API_KEY}`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  },
};

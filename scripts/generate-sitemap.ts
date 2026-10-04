import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://forgehireloop.com';
const envPid = process.env.VITE_FIREBASE_PROJECT_ID;
const PROJECT_ID = (!envPid || envPid.startsWith('gen-lang-client')) ? 'forgehireloop' : envPid;

interface FirestoreField {
  stringValue?: string;
  integerValue?: string;
  booleanValue?: boolean;
  timestampValue?: string;
  arrayValue?: {
    values?: FirestoreField[];
  };
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreField>;
  createTime?: string;
  updateTime?: string;
}

interface FirestoreListResponse {
  documents?: FirestoreDocument[];
}

function parseFirestoreDoc(doc: FirestoreDocument): Record<string, any> {
  const result: Record<string, any> = {};
  const segments = doc.name.split('/');
  result.id = segments[segments.length - 1];

  if (doc.updateTime) {
    result.updatedAt = doc.updateTime;
  }

  if (doc.fields) {
    for (const [key, field] of Object.entries(doc.fields)) {
      if (field.stringValue !== undefined) result[key] = field.stringValue;
      else if (field.integerValue !== undefined) result[key] = parseInt(field.integerValue, 10);
      else if (field.booleanValue !== undefined) result[key] = field.booleanValue;
      else if (field.timestampValue !== undefined) result[key] = field.timestampValue;
    }
  }

  return result;
}

async function fetchCollectionFromFirestore(collectionName: string): Promise<any[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=300`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Firestore REST API returned ${res.status} for ${collectionName}. Falling back to default data store.`);
      return [];
    }
    const data = (await res.json()) as FirestoreListResponse;
    if (!data.documents || !Array.isArray(data.documents)) {
      return [];
    }
    return data.documents.map(parseFirestoreDoc);
  } catch (err: any) {
    console.warn(`Unable to fetch ${collectionName} from Firestore REST:`, err.message);
    return [];
  }
}

export async function generateDynamicSitemapXml(baseUrl: string = BASE_URL): Promise<string> {
  console.log(`[Sitemap] Fetching active jobs & verified companies from Firestore (Project: ${PROJECT_ID})...`);

  // 1. Fetch from Firestore REST
  const [firestoreJobs, firestoreCompanies] = await Promise.all([
    fetchCollectionFromFirestore('jobs'),
    fetchCollectionFromFirestore('companies'),
  ]);

  // 2. Load fallback seeded data if Firestore is empty or cold
  let jobs = firestoreJobs.filter((j) => j.status === 'active' || !j.status);
  let companies = firestoreCompanies;

  if (jobs.length === 0 || companies.length === 0) {
    try {
      // Dynamic import of in-memory seed db
      const { db } = await import('../server/db.js');
      if (jobs.length === 0) {
        jobs = db.getJobs().filter((j) => j.status === 'active');
      }
      if (companies.length === 0) {
        companies = db.getCompanies();
      }
    } catch {
      // Ignore if server/db cannot be loaded
    }
  }

  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/companies</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;

  // Dynamic Job URLs
  const seenJobIds = new Set<string>();
  for (const job of jobs) {
    if (!job.id || seenJobIds.has(job.id)) continue;
    seenJobIds.add(job.id);
    const jobDate = (job.updatedAt || job.postedAt || today).split('T')[0];
    xml += `  <url>
    <loc>${baseUrl}/jobs/${encodeURIComponent(job.id)}</loc>
    <lastmod>${jobDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;
  }

  // Dynamic Company URLs
  const seenCompIds = new Set<string>();
  for (const comp of companies) {
    if (!comp.id || seenCompIds.has(comp.id)) continue;
    seenCompIds.add(comp.id);
    const compDate = (comp.updatedAt || today).split('T')[0];
    xml += `  <url>
    <loc>${baseUrl}/companies/${encodeURIComponent(comp.id)}</loc>
    <lastmod>${compDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  xml += `</urlset>\n`;
  return xml;
}

async function run() {
  try {
    const sitemapContent = await generateDynamicSitemapXml(BASE_URL);

    // Save to public/sitemap.xml so Vite copies it to dist/
    const publicPath = path.resolve(process.cwd(), 'public/sitemap.xml');
    fs.writeFileSync(publicPath, sitemapContent, 'utf-8');
    console.log(`[Sitemap] Successfully wrote sitemap to ${publicPath}`);

    // Also update dist/sitemap.xml if dist directory exists
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      const distPath = path.join(distDir, 'sitemap.xml');
      fs.writeFileSync(distPath, sitemapContent, 'utf-8');
      console.log(`[Sitemap] Successfully updated ${distPath}`);
    }
  } catch (err) {
    console.error('[Sitemap] Failed to generate sitemap.xml:', err);
    process.exit(1);
  }
}

// Execute directly when called via CLI
run();

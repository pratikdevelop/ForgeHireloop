import { adminDb } from '../server/firebaseAdmin';
import fs from 'fs';
import path from 'path';

async function seedDataIntoFirestore() {
  const dbJsonPath = path.join(process.cwd(), 'data', 'db.json');
  if (!fs.existsSync(dbJsonPath)) {
    console.log('[Seed] data/db.json not found, skipping initial seed.');
    return;
  }

  const raw = fs.readFileSync(dbJsonPath, 'utf-8');
  const data = JSON.parse(raw);

  console.log('[Seed] Seeding sample data from data/db.json into Firestore...');

  // 1. Companies
  if (Array.isArray(data.companies)) {
    for (const comp of data.companies) {
      const ref = adminDb.collection('companies').doc(comp.id);
      const snap = await ref.get();
      if (!snap.exists) {
        await ref.set(comp);
        console.log(`[Seed] Seeded company: ${comp.name} (${comp.id})`);
      }
    }
  }

  // 2. Jobs
  if (Array.isArray(data.jobs)) {
    for (const job of data.jobs) {
      const ref = adminDb.collection('jobs').doc(job.id);
      const snap = await ref.get();
      if (!snap.exists) {
        const { company, ...jobData } = job;
        await ref.set(jobData);
        console.log(`[Seed] Seeded job: ${job.title} (${job.id})`);
      }
    }
  }

  // 3. Categories
  if (Array.isArray(data.categories)) {
    for (const cat of data.categories) {
      const ref = adminDb.collection('categories').doc(cat.id);
      const snap = await ref.get();
      if (!snap.exists) {
        await ref.set(cat);
        console.log(`[Seed] Seeded category: ${cat.name} (${cat.id})`);
      }
    }
  }

  // 4. Users (candidate & employer profiles)
  if (Array.isArray(data.users)) {
    for (const u of data.users) {
      const ref = adminDb.collection('users').doc(u.id);
      const snap = await ref.get();
      if (!snap.exists) {
        // Strip sensitive passwordHash before saving to Firestore user profiles
        const { passwordHash, ...userProfile } = u;
        await ref.set(userProfile);
        console.log(`[Seed] Seeded user profile: ${u.name} (${u.id})`);
      }
    }
  }

  // 5. Applications
  if (Array.isArray(data.applications)) {
    for (const app of data.applications) {
      const ref = adminDb.collection('applications').doc(app.id);
      const snap = await ref.get();
      if (!snap.exists) {
        const { job, candidate, company, ...appData } = app;
        await ref.set(appData);
        console.log(`[Seed] Seeded application: ${app.id}`);
      }
    }
  }

  console.log('[Seed] Seeding completed successfully!');
}

seedDataIntoFirestore()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Seed] Seeding error (non-fatal):', err);
    process.exit(0);
  });

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User, Company, Job, Application } from '../types';

/**
 * firestoreService: Handles public, read-only data access from Firestore.
 * In accordance with our security architecture:
 * All writes and privileged mutations (jobs, applications, moderation)
 * are routed through the Express API layer via `src/api/client.ts`.
 */
export const firestoreService = {
  // ================= USERS (READ ONLY) =================
  async getUser(uid: string): Promise<User | null> {
    const path = `users/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      return { id: snap.id, ...(snap.data() as Omit<User, 'id'>) };
    } catch (err: any) {
      if (err?.message?.includes('client is offline')) {
        return null;
      }
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async getAllUsers(): Promise<User[]> {
    const path = 'users';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<User, 'id'>) }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  // ================= COMPANIES (READ ONLY) =================
  async getCompany(companyId: string): Promise<Company | null> {
    const path = `companies/${companyId}`;
    try {
      const snap = await getDoc(doc(db, 'companies', companyId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...(snap.data() as Omit<Company, 'id'>) };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async getCompanies(params?: { industry?: string; search?: string }): Promise<Company[]> {
    const path = 'companies';
    try {
      const snap = await getDocs(collection(db, path));
      let companies: Company[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Company, 'id'>) }));
      if (params?.industry && params.industry !== 'all') {
        companies = companies.filter((c) => c.industry?.toLowerCase() === params.industry?.toLowerCase());
      }
      if (params?.search) {
        const s = params.search.toLowerCase();
        companies = companies.filter((c) => c.name?.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s));
      }
      return companies;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  // ================= JOBS (READ ONLY) =================
  async getJobs(filterOptions?: {
    keyword?: string;
    location?: string;
    jobType?: string;
    experienceLevel?: string;
    workplaceType?: string;
    industry?: string;
    companyId?: string;
    status?: string;
    limitCount?: number;
  }): Promise<Job[]> {
    const path = 'jobs';
    try {
      const constraints: any[] = [];
      if (filterOptions?.companyId) {
        constraints.push(where('companyId', '==', filterOptions.companyId));
      }
      if (filterOptions?.status) {
        constraints.push(where('status', '==', filterOptions.status));
      }

      const q = constraints.length > 0 ? query(collection(db, path), ...constraints) : collection(db, path);
      const snap = await getDocs(q);

      let jobs: Job[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Job, 'id'>) }));

      // Attach company details
      const companies = await this.getCompanies();
      const companyMap = new Map<string, Company>(companies.map((c) => [c.id, c]));

      jobs = jobs.map((j) => ({
        ...j,
        company: companyMap.get(j.companyId) || j.company,
      }));

      // Apply client-side search filters
      if (filterOptions?.keyword) {
        const kw = filterOptions.keyword.toLowerCase().trim();
        jobs = jobs.filter(
          (j) =>
            j.title?.toLowerCase().includes(kw) ||
            j.description?.toLowerCase().includes(kw) ||
            j.skills?.some((s) => s.toLowerCase().includes(kw)) ||
            j.company?.name?.toLowerCase().includes(kw)
        );
      }

      if (filterOptions?.location) {
        const loc = filterOptions.location.toLowerCase().trim();
        jobs = jobs.filter((j) => j.location?.toLowerCase().includes(loc));
      }

      if (filterOptions?.jobType && filterOptions.jobType !== 'all') {
        jobs = jobs.filter((j) => j.jobType?.toLowerCase() === filterOptions.jobType?.toLowerCase());
      }

      if (filterOptions?.workplaceType && filterOptions.workplaceType !== 'all') {
        jobs = jobs.filter((j) => j.workplaceType?.toLowerCase() === filterOptions.workplaceType?.toLowerCase());
      }

      if (filterOptions?.experienceLevel && filterOptions.experienceLevel !== 'all') {
        jobs = jobs.filter((j) => j.experienceLevel?.toLowerCase() === filterOptions.experienceLevel?.toLowerCase());
      }

      if (filterOptions?.industry && filterOptions.industry !== 'all') {
        jobs = jobs.filter((j) => j.industry?.toLowerCase() === filterOptions.industry?.toLowerCase());
      }

      // Sort by postedAt desc
      jobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

      if (filterOptions?.limitCount) {
        jobs = jobs.slice(0, filterOptions.limitCount);
      }

      return jobs;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async getFeaturedJobs(): Promise<Job[]> {
    const jobs = await this.getJobs({ status: 'active', limitCount: 6 });
    return jobs;
  },

  async getJobById(jobId: string): Promise<Job | null> {
    const path = `jobs/${jobId}`;
    try {
      const snap = await getDoc(doc(db, 'jobs', jobId));
      if (!snap.exists()) return null;
      const job = { id: snap.id, ...(snap.data() as Omit<Job, 'id'>) };
      if (job.companyId) {
        const company = await this.getCompany(job.companyId);
        if (company) job.company = company;
      }
      return job;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  // ================= APPLICATIONS (READ ONLY) =================
  async getApplicationsForCandidate(candidateId: string): Promise<Application[]> {
    const path = 'applications';
    try {
      const q = query(collection(db, path), where('candidateId', '==', candidateId));
      const snap = await getDocs(q);
      const apps: Application[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Application, 'id'>),
      }));

      // Enrich with job and company
      const allJobs = await this.getJobs();
      const jobMap = new Map<string, Job>(allJobs.map((j) => [j.id, j]));

      return apps.map((app) => ({
        ...app,
        job: jobMap.get(app.jobId) || app.job,
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async getApplicationsForCompany(companyId: string): Promise<Application[]> {
    const path = 'applications';
    try {
      const q = query(collection(db, path), where('companyId', '==', companyId));
      const snap = await getDocs(q);
      const apps: Application[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Application, 'id'>),
      }));

      const allJobs = await this.getJobs();
      const jobMap = new Map<string, Job>(allJobs.map((j) => [j.id, j]));

      return apps.map((app) => ({
        ...app,
        job: jobMap.get(app.jobId) || app.job,
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async checkIfUserApplied(jobId: string, candidateId: string): Promise<boolean> {
    const path = 'applications';
    try {
      const q = query(
        collection(db, path),
        where('jobId', '==', jobId),
        where('candidateId', '==', candidateId)
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  // Fallbacks for profile sync if needed
  async setUser(uid: string, data: Partial<User>): Promise<User> {
    return { ...data, id: uid } as User;
  },

  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    return;
  },

  async setCompany(companyId: string, updates: Partial<Company>): Promise<Company> {
    return { ...updates, id: companyId } as Company;
  },
};

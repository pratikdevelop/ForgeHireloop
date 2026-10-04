import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User, Company, Job, Application, ApplicationStatus, StatusHistoryItem } from '../types';
import { sanitizeFirestoreData } from '../utils/cleanData';

export const firestoreService = {
  // ================= USERS =================
  async getUser(uid: string): Promise<User | null> {
    const path = `users/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      return { id: snap.id, ...(snap.data() as Omit<User, 'id'>) };
    } catch (err: any) {
      // If client is offline or network fails, return cached local user if available without crashing
      if (err?.message?.includes('client is offline')) {
        console.warn(`[Firestore] Client is offline when getting ${path}. Returning null to allow offline cache fallback.`);
        return null;
      }
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async setUser(uid: string, data: Partial<User>): Promise<User> {
    const path = `users/${uid}`;
    try {
      const now = new Date().toISOString();
      const rawUserData: Record<string, any> = {
        ...data,
        id: uid,
        updatedAt: now,
      };
      if (!data.createdAt) {
        rawUserData.createdAt = now;
      }
      const userData = sanitizeFirestoreData(rawUserData);
      await setDoc(doc(db, 'users', uid), userData, { merge: true });
      return userData as User;
    } catch (err: any) {
      if (err?.message?.includes('client is offline')) {
        console.warn(`[Firestore] Client is offline when writing ${path}. Using optimistic update.`);
        return { ...data, id: uid } as User;
      }
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    const path = `users/${uid}`;
    try {
      const cleanedUpdates = sanitizeFirestoreData({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'users', uid), cleanedUpdates);
    } catch (err: any) {
      if (err?.message?.includes('client is offline')) {
        console.warn(`[Firestore] Client is offline when updating ${path}. Skipping remote update.`);
        return;
      }
      handleFirestoreError(err, OperationType.UPDATE, path);
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

  // ================= COMPANIES =================
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

  async getCompanies(): Promise<Company[]> {
    const path = 'companies';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Company, 'id'>) }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async setCompany(company: Company): Promise<Company> {
    const path = `companies/${company.id}`;
    try {
      const now = new Date().toISOString();
      const rawCompanyData = {
        ...company,
        updatedAt: now,
        createdAt: company.createdAt || now,
      };
      const companyData = sanitizeFirestoreData(rawCompanyData);
      await setDoc(doc(db, 'companies', company.id), companyData, { merge: true });
      return companyData as Company;
    } catch (err: any) {
      if (err?.message?.includes('client is offline')) {
        console.warn(`[Firestore] Client is offline when writing ${path}. Using optimistic company data.`);
        return company;
      }
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  // ================= JOBS =================
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

      // Apply client-side search filters for fuzzy match
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

  async createJob(jobData: Partial<Job>): Promise<Job> {
    const path = 'jobs';
    try {
      const id = jobData.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newJob: Job = sanitizeFirestoreData({
        id,
        companyId: jobData.companyId || '',
        employerId: jobData.employerId || '',
        title: jobData.title || 'Untitled Job',
        description: jobData.description || '',
        requirements: jobData.requirements || [],
        responsibilities: jobData.responsibilities || [],
        skills: jobData.skills || [],
        location: jobData.location || 'Remote',
        workplaceType: jobData.workplaceType || 'remote',
        jobType: jobData.jobType || 'full-time',
        experienceLevel: jobData.experienceLevel || 'mid',
        minExperienceYears: jobData.minExperienceYears || 2,
        salaryMin: jobData.salaryMin,
        salaryMax: jobData.salaryMax,
        salaryCurrency: jobData.salaryCurrency || 'USD',
        salaryPeriod: jobData.salaryPeriod || 'yearly',
        industry: jobData.industry || 'Technology',
        category: jobData.category || 'Engineering',
        status: jobData.status || 'active',
        viewsCount: 0,
        applicantCount: 0,
        postedAt: now,
        updatedAt: now,
      });

      await setDoc(doc(db, 'jobs', id), newJob);
      return newJob;
    } catch (err: any) {
      if (err?.message?.includes('client is offline')) {
        console.warn(`[Firestore] Client is offline when creating job ${path}.`);
        return jobData as Job;
      }
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
    const path = `jobs/${jobId}`;
    try {
      const cleaned = sanitizeFirestoreData({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'jobs', jobId), cleaned);
    } catch (err: any) {
      if (err?.message?.includes('client is offline')) {
        console.warn(`[Firestore] Client is offline when updating job ${path}.`);
        return;
      }
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async deleteJob(jobId: string): Promise<void> {
    const path = `jobs/${jobId}`;
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  // ================= APPLICATIONS =================
  async getApplicationsForCandidate(candidateId: string): Promise<Application[]> {
    const path = 'applications';
    try {
      const q = query(collection(db, path), where('candidateId', '==', candidateId));
      const snap = await getDocs(q);
      const applications = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Application, 'id'>) }));

      // Attach jobs and companies
      const jobs = await this.getJobs();
      const jobMap = new Map<string, Job>(jobs.map((j) => [j.id, j]));

      return applications
        .map((app) => ({
          ...app,
          job: jobMap.get(app.jobId) || app.job,
        }))
        .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async getApplicationsForCompany(companyId: string): Promise<Application[]> {
    const path = 'applications';
    try {
      const q = query(collection(db, path), where('companyId', '==', companyId));
      const snap = await getDocs(q);
      const applications = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Application, 'id'>) }));

      const jobs = await this.getJobs({ companyId });
      const jobMap = new Map<string, Job>(jobs.map((j) => [j.id, j]));

      return applications
        .map((app) => ({
          ...app,
          job: jobMap.get(app.jobId) || app.job,
        }))
        .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async createApplication(appData: {
    jobId: string;
    companyId: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    candidateHeadline?: string;
    candidatePhotoUrl?: string;
    resumeUrl?: string;
    resumeFileName?: string;
    coverNote?: string;
  }): Promise<Application> {
    const path = 'applications';
    try {
      const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const rawApplication: Application = {
        id,
        jobId: appData.jobId,
        companyId: appData.companyId,
        candidateId: appData.candidateId,
        resumeUrl: appData.resumeUrl,
        resumeFileName: appData.resumeFileName,
        coverNote: appData.coverNote,
        status: 'applied',
        statusHistory: [
          {
            status: 'applied',
            timestamp: now,
            note: 'Application submitted',
          },
        ],
        appliedAt: now,
        updatedAt: now,
        candidate: {
          id: appData.candidateId,
          name: appData.candidateName,
          email: appData.candidateEmail,
          headline: appData.candidateHeadline,
          photoUrl: appData.candidatePhotoUrl,
          resumeUrl: appData.resumeUrl,
          resumeFileName: appData.resumeFileName,
        },
      };

      const newApplication = sanitizeFirestoreData(rawApplication);
      await setDoc(doc(db, 'applications', id), newApplication);

      // Increment job applicant count
      try {
        await updateDoc(doc(db, 'jobs', appData.jobId), {
          applicantCount: increment(1),
          updatedAt: now,
        });
      } catch (e) {
        console.warn('Could not increment applicantCount on job doc:', e);
      }

      return newApplication;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    note?: string
  ): Promise<void> {
    const path = `applications/${applicationId}`;
    try {
      const now = new Date().toISOString();
      const snap = await getDoc(doc(db, 'applications', applicationId));
      if (!snap.exists()) throw new Error('Application not found');

      const existingData = snap.data() as Application;
      const history: StatusHistoryItem[] = existingData.statusHistory || [];
      history.push({
        status,
        timestamp: now,
        note: note || `Status updated to ${status}`,
      });

      await updateDoc(doc(db, 'applications', applicationId), {
        status,
        statusHistory: history,
        updatedAt: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
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

  async ensureInitialData(): Promise<void> {
    try {
      const jobsSnap = await getDocs(collection(db, 'jobs'));
      if (!jobsSnap.empty) return;

      const now = new Date().toISOString();

      // Seed Real Companies in Firestore
      const companies: Company[] = [
        {
          id: 'comp_techflow',
          name: 'TechFlow AI',
          logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
          bannerUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
          description: 'Pioneering generative AI workflows and next-generation developer tooling.',
          industry: 'Artificial Intelligence',
          size: '50-150 employees',
          website: 'https://techflow.example.com',
          location: 'San Francisco, CA',
          verified: true,
          employerIds: [],
          activeJobsCount: 2,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'comp_stripe',
          name: 'Stripe',
          logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&auto=format&fit=crop&q=80',
          bannerUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80',
          description: 'Financial infrastructure for the internet. Millions of companies rely on Stripe.',
          industry: 'FinTech',
          size: '5,000+ employees',
          website: 'https://stripe.com',
          location: 'San Francisco, CA',
          verified: true,
          employerIds: [],
          activeJobsCount: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'comp_cloudscale',
          name: 'CloudScale Systems',
          logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&auto=format&fit=crop&q=80',
          bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
          description: 'High performance edge cloud infrastructure and autonomous distributed systems.',
          industry: 'Cloud Computing',
          size: '200-500 employees',
          website: 'https://cloudscale.example.com',
          location: 'Seattle, WA',
          verified: true,
          employerIds: [],
          activeJobsCount: 1,
          createdAt: now,
          updatedAt: now,
        },
      ];

      for (const comp of companies) {
        await setDoc(doc(db, 'companies', comp.id), comp);
      }

      // Seed Real Jobs in Firestore
      const jobs: Job[] = [
        {
          id: 'job_senior_fullstack_techflow',
          companyId: 'comp_techflow',
          employerId: 'system_seed',
          title: 'Senior Full-Stack Engineer',
          description:
            'Join our core product team building high-performance AI workspace interfaces. You will architect real-time features and responsive frontend experiences.',
          requirements: [
            '4+ years production experience with React, TypeScript, and Node.js',
            'Strong background in distributed databases or real-time systems',
            'Familiarity with cloud platforms (GCP, AWS, Firebase)',
          ],
          responsibilities: [
            'Architect scalable web client and API architectures',
            'Design accessible UI components adhering to strict design standards',
            'Partner with AI researchers to deploy user-facing models',
          ],
          skills: ['React', 'TypeScript', 'Node.js', 'Firebase', 'Tailwind CSS'],
          location: 'San Francisco, CA',
          workplaceType: 'hybrid',
          jobType: 'full-time',
          experienceLevel: 'senior',
          minExperienceYears: 4,
          salaryMin: 165000,
          salaryMax: 215000,
          salaryCurrency: 'USD',
          salaryPeriod: 'yearly',
          industry: 'Artificial Intelligence',
          category: 'Engineering',
          status: 'active',
          viewsCount: 142,
          applicantCount: 3,
          postedAt: now,
          updatedAt: now,
        },
        {
          id: 'job_lead_frontend_stripe',
          companyId: 'comp_stripe',
          employerId: 'system_seed',
          title: 'Lead Frontend Platform Engineer',
          description:
            'Lead the frontend foundation team that powers thousands of payment checkouts worldwide. Focus on performance, bundle size, and ultra-high reliability.',
          requirements: [
            '6+ years web engineering experience',
            'Deep expertise in modern JavaScript/TypeScript internals and browser performance',
            'Proven track record scaling mission-critical web applications',
          ],
          responsibilities: [
            'Set technical standards and design system tokens for web engineering',
            'Optimize Core Web Vitals across millions of global checkout sessions',
            'Mentor and guide senior engineering talent',
          ],
          skills: ['TypeScript', 'React', 'Performance Optimization', 'Web Standards'],
          location: 'San Francisco, CA',
          workplaceType: 'remote',
          jobType: 'full-time',
          experienceLevel: 'lead',
          minExperienceYears: 6,
          salaryMin: 195000,
          salaryMax: 260000,
          salaryCurrency: 'USD',
          salaryPeriod: 'yearly',
          industry: 'FinTech',
          category: 'Engineering',
          status: 'active',
          viewsCount: 289,
          applicantCount: 7,
          postedAt: now,
          updatedAt: now,
        },
        {
          id: 'job_cloud_devops_cloudscale',
          companyId: 'comp_cloudscale',
          employerId: 'system_seed',
          title: 'Staff Site Reliability & Cloud Architect',
          description:
            'Architect next-generation multi-region Kubernetes clusters with zero-downtime automated failover.',
          requirements: [
            '5+ years Kubernetes and Cloud Infrastructure experience',
            'Expertise in Terraform, CI/CD pipelines, and observability',
            'Strong communication and incident management skills',
          ],
          responsibilities: [
            'Maintain 99.999% availability for edge delivery networks',
            'Automate infrastructure-as-code deployments',
            'Conduct root-cause post-mortems and security reviews',
          ],
          skills: ['Kubernetes', 'Go', 'Terraform', 'GCP', 'Docker'],
          location: 'Seattle, WA',
          workplaceType: 'remote',
          jobType: 'full-time',
          experienceLevel: 'senior',
          minExperienceYears: 5,
          salaryMin: 180000,
          salaryMax: 235000,
          salaryCurrency: 'USD',
          salaryPeriod: 'yearly',
          industry: 'Cloud Computing',
          category: 'DevOps & Infrastructure',
          status: 'active',
          viewsCount: 94,
          applicantCount: 2,
          postedAt: now,
          updatedAt: now,
        },
      ];

      for (const job of jobs) {
        await setDoc(doc(db, 'jobs', job.id), job);
      }
    } catch (err) {
      console.warn('Initial data seeding note:', err);
    }
  },
};

import {
  User,
  Company,
  Job,
  Application,
  JobAlert,
  Message,
  AdminStats,
  PlatformCategory,
  FlaggedContent,
  ApplicationStatus,
} from '../types';
import { firestoreService } from './firestoreService';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc, query, where } from 'firebase/firestore';

export const api = {
  // ================= AUTH =================
  register: async (payload: any) => {
    // Auth registration is performed directly in AuthContext via Firebase Auth.
    // This fallback provides backwards compatibility if invoked directly.
    return { token: 'firebase-token', user: payload, company: undefined };
  },

  login: async (payload: { email: string; password: string }) => {
    return { token: 'firebase-token', user: {} as User, company: undefined };
  },

  googleLogin: async (payload: any) => {
    return { token: 'firebase-token', user: {} as User, company: undefined };
  },

  getMe: async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    let user = await firestoreService.getUser(currentUser.uid);
    if (!user) {
      const cached = localStorage.getItem('forgehireloop_user');
      if (cached) {
        try {
          user = JSON.parse(cached);
        } catch {}
      }
    }
    if (!user) throw new Error('User profile not found');
    let company: Company | undefined = undefined;
    if (user.companyId) {
      const comp = await firestoreService.getCompany(user.companyId);
      if (comp) company = comp;
      else {
        const cachedComp = localStorage.getItem('forgehireloop_company');
        if (cachedComp) {
          try {
            company = JSON.parse(cachedComp);
          } catch {}
        }
      }
    }
    return { user, company };
  },

  updateProfile: async (updates: Partial<User>) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    await firestoreService.updateUser(currentUser.uid, updates);
    const user = await firestoreService.getUser(currentUser.uid);
    return { user: user!, company: undefined };
  },

  uploadResume: async (payload: { resumeUrl: string; resumeFileName: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    await firestoreService.updateUser(currentUser.uid, {
      resumeUrl: payload.resumeUrl,
      resumeFileName: payload.resumeFileName,
      resumeUploadedAt: new Date().toISOString(),
    });
    const user = await firestoreService.getUser(currentUser.uid);
    return { message: 'Resume uploaded successfully', user: user! };
  },

  // ================= JOBS =================
  getJobs: async (params?: Record<string, any>) => {
    await firestoreService.ensureInitialData();
    const jobs = await firestoreService.getJobs({
      keyword: params?.search || params?.keyword,
      location: params?.location,
      jobType: params?.jobType,
      experienceLevel: params?.experienceLevel,
      workplaceType: params?.workplaceType,
      industry: params?.industry,
      status: params?.status || 'active',
      limitCount: params?.limit ? Number(params.limit) : undefined,
    });
    return { count: jobs.length, jobs };
  },

  getJobRecommendations: async () => {
    await firestoreService.ensureInitialData();
    const allJobs = await firestoreService.getJobs({ status: 'active' });
    return { recommendations: allJobs.slice(0, 6) };
  },

  getJobById: async (id: string) => {
    const job = await firestoreService.getJobById(id);
    if (!job) throw new Error('Job not found');
    return job;
  },

  getMyPostedJobs: async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    const userDoc = await firestoreService.getUser(currentUser.uid);
    const companyId = userDoc?.companyId;

    if (!companyId) {
      // Find jobs posted by this employer directly
      const allJobs = await firestoreService.getJobs();
      return allJobs.filter((j) => j.employerId === currentUser.uid);
    }

    const companyJobs = await firestoreService.getJobs({ companyId });
    return companyJobs;
  },

  createJob: async (job: Partial<Job>) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('You must be signed in as an employer to post jobs');
    const userDoc = await firestoreService.getUser(currentUser.uid);

    const created = await firestoreService.createJob({
      ...job,
      employerId: currentUser.uid,
      companyId: userDoc?.companyId || job.companyId || 'comp_custom',
    });
    return created;
  },

  updateJob: async (id: string, updates: Partial<Job>) => {
    await firestoreService.updateJob(id, updates);
    const updated = await firestoreService.getJobById(id);
    return updated!;
  },

  updateJobStatus: async (id: string, payload: { status?: string; renew?: boolean }) => {
    const updates: Partial<Job> = {};
    if (payload.status) updates.status = payload.status as any;
    if (payload.renew) updates.postedAt = new Date().toISOString();
    await firestoreService.updateJob(id, updates);
    const updated = await firestoreService.getJobById(id);
    return updated!;
  },

  deleteJob: async (id: string) => {
    await firestoreService.deleteJob(id);
    return { message: 'Job deleted successfully' };
  },

  toggleSaveJob: async (id: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    const userDoc = await firestoreService.getUser(currentUser.uid);
    const currentSaved = userDoc?.savedJobIds || [];
    const newSaved = currentSaved.includes(id)
      ? currentSaved.filter((jid) => jid !== id)
      : [...currentSaved, id];
    await firestoreService.updateUser(currentUser.uid, { savedJobIds: newSaved });
    return { savedJobIds: newSaved };
  },

  // ================= APPLICATIONS =================
  applyToJob: async (
    jobId: string,
    payload: { resumeUrl?: string; resumeFileName?: string; coverNote?: string }
  ) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Please sign in to submit your application');
    const userDoc = await firestoreService.getUser(currentUser.uid);
    const job = await firestoreService.getJobById(jobId);
    if (!job) throw new Error('Job not found');

    const createdApp = await firestoreService.createApplication({
      jobId,
      companyId: job.companyId,
      candidateId: currentUser.uid,
      candidateName: userDoc?.name || currentUser.displayName || 'Candidate',
      candidateEmail: userDoc?.email || currentUser.email || '',
      candidateHeadline: userDoc?.headline,
      candidatePhotoUrl: userDoc?.photoUrl || currentUser.photoURL || undefined,
      resumeUrl: payload.resumeUrl || userDoc?.resumeUrl,
      resumeFileName: payload.resumeFileName || userDoc?.resumeFileName,
      coverNote: payload.coverNote,
    });

    return createdApp;
  },

  getMyApplications: async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    return await firestoreService.getApplicationsForCandidate(currentUser.uid);
  },

  getEmployerApplications: async (params?: { jobId?: string; status?: string; skill?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    const userDoc = await firestoreService.getUser(currentUser.uid);
    if (!userDoc?.companyId) {
      // Look for applications across jobs posted by this employer
      const myJobs = await firestoreService.getJobs();
      const myJobIds = myJobs.filter((j) => j.employerId === currentUser.uid).map((j) => j.id);
      if (myJobIds.length === 0) return [];
      
      const allAppsSnap = await getDocs(collection(db, 'applications'));
      let apps = allAppsSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Application, 'id'>) }))
        .filter((a) => myJobIds.includes(a.jobId));
      return apps;
    }

    let apps = await firestoreService.getApplicationsForCompany(userDoc.companyId);

    if (params?.jobId && params.jobId !== 'all') {
      apps = apps.filter((a) => a.jobId === params.jobId);
    }
    if (params?.status && params.status !== 'all') {
      apps = apps.filter((a) => a.status === params.status);
    }
    if (params?.skill) {
      const sk = params.skill.toLowerCase();
      apps = apps.filter((a) => a.candidate?.skills?.some((s) => s.toLowerCase().includes(sk)));
    }

    return apps;
  },

  updateApplicationStatus: async (
    id: string,
    payload: { status: ApplicationStatus; note?: string; interviewDate?: string; employerNotes?: string }
  ) => {
    await firestoreService.updateApplicationStatus(id, payload.status, payload.note);
    if (payload.interviewDate || payload.employerNotes) {
      await updateDoc(doc(db, 'applications', id), {
        ...(payload.interviewDate ? { interviewDate: payload.interviewDate } : {}),
        ...(payload.employerNotes ? { employerNotes: payload.employerNotes } : {}),
      });
    }
    const snap = await getDoc(doc(db, 'applications', id));
    return { id: snap.id, ...(snap.data() as Omit<Application, 'id'>) };
  },

  // ================= RESUME SEARCH (EMPLOYER) =================
  searchCandidates: async (params?: { query?: string; keyword?: string; skill?: string; location?: string; minExperience?: number }) => {
    const allUsers = await firestoreService.getAllUsers();
    let candidates = allUsers.filter((u) => u.role === 'candidate');

    const searchKeyword = (params?.query || params?.keyword || '').toLowerCase().trim();
    if (searchKeyword) {
      candidates = candidates.filter(
        (c) =>
          c.name?.toLowerCase().includes(searchKeyword) ||
          c.headline?.toLowerCase().includes(searchKeyword) ||
          c.skills?.some((s) => s.toLowerCase().includes(searchKeyword)) ||
          c.bio?.toLowerCase().includes(searchKeyword)
      );
    }

    if (params?.skill) {
      const sk = params.skill.toLowerCase();
      candidates = candidates.filter((c) => c.skills?.some((s) => s.toLowerCase().includes(sk)));
    }

    if (params?.location) {
      const loc = params.location.toLowerCase();
      candidates = candidates.filter((c) => c.location?.toLowerCase().includes(loc));
    }

    if (params?.minExperience) {
      candidates = candidates.filter((c) => (c.experienceYears || 0) >= Number(params.minExperience));
    }

    return candidates;
  },

  // ================= COMPANIES =================
  getCompanies: async () => {
    await firestoreService.ensureInitialData();
    return await firestoreService.getCompanies();
  },

  getCompanyById: async (id: string) => {
    const comp = await firestoreService.getCompany(id);
    if (!comp) throw new Error('Company not found');
    return comp;
  },

  updateCompany: async (id: string, updates: Partial<Company>) => {
    const existing = await firestoreService.getCompany(id);
    const merged = { ...(existing || {}), ...updates, id } as Company;
    return await firestoreService.setCompany(merged);
  },

  toggleFollowCompany: async (id: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    const userDoc = await firestoreService.getUser(currentUser.uid);
    const currentFollowed = userDoc?.followedCompanyIds || [];
    const newFollowed = currentFollowed.includes(id)
      ? currentFollowed.filter((cid) => cid !== id)
      : [...currentFollowed, id];
    await firestoreService.updateUser(currentUser.uid, { followedCompanyIds: newFollowed });
    return { followedCompanyIds: newFollowed };
  },

  // ================= ALERTS =================
  getAlerts: async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    const snap = await getDocs(query(collection(db, 'alerts'), where('candidateId', '==', currentUser.uid)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobAlert, 'id'>) }));
  },

  createAlert: async (alert: Partial<JobAlert>) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    const id = `alert_${Date.now()}`;
    const newAlert: JobAlert = {
      id,
      candidateId: currentUser.uid,
      title: alert.title || 'Job Alert',
      keywords: alert.keywords || '',
      location: alert.location,
      industry: alert.industry,
      jobType: alert.jobType,
      minSalary: alert.minSalary,
      frequency: alert.frequency || 'weekly',
      active: true,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'alerts', id), newAlert);
    return newAlert;
  },

  deleteAlert: async (id: string) => {
    await deleteDoc(doc(db, 'alerts', id));
    return { message: 'Alert deleted' };
  },

  // ================= MESSAGES =================
  getMessages: async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    const snap = await getDocs(collection(db, 'messages'));
    const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }));
    return all.filter((m) => m.senderId === currentUser.uid || m.recipientId === currentUser.uid);
  },

  sendMessage: async (payload: { recipientId: string; content: string; applicationId?: string; jobId?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    const userDoc = await firestoreService.getUser(currentUser.uid);
    const id = `msg_${Date.now()}`;
    const msg: Message = {
      id,
      applicationId: payload.applicationId,
      jobId: payload.jobId,
      senderId: currentUser.uid,
      recipientId: payload.recipientId,
      senderName: userDoc?.name || currentUser.displayName || 'User',
      senderRole: userDoc?.role || 'candidate',
      content: payload.content,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'messages', id), msg);
    return msg;
  },

  // ================= ADMIN =================
  getAdminStats: async (): Promise<AdminStats> => {
    const [users, jobs, companies, appsSnap] = await Promise.all([
      firestoreService.getAllUsers(),
      firestoreService.getJobs(),
      firestoreService.getCompanies(),
      getDocs(collection(db, 'applications')),
    ]);

    const apps = appsSnap.docs.map((d) => d.data() as Application);

    const statusCounts: Record<ApplicationStatus, number> = {
      applied: 0,
      viewed: 0,
      shortlisted: 0,
      interview: 0,
      rejected: 0,
      hired: 0,
    };

    apps.forEach((a) => {
      if (a.status && statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      }
    });

    const categories: PlatformCategory[] = [
      { id: 'cat_eng', name: 'Engineering', iconName: 'Code', jobCount: jobs.filter((j) => j.category === 'Engineering').length },
      { id: 'cat_design', name: 'Design & Creative', iconName: 'Palette', jobCount: jobs.filter((j) => j.category === 'Design & Creative').length },
      { id: 'cat_prod', name: 'Product Management', iconName: 'Compass', jobCount: jobs.filter((j) => j.category === 'Product Management').length },
      { id: 'cat_devops', name: 'DevOps & Infrastructure', iconName: 'Server', jobCount: jobs.filter((j) => j.category === 'DevOps & Infrastructure').length },
      { id: 'cat_data', name: 'Data & Analytics', iconName: 'BarChart', jobCount: jobs.filter((j) => j.category === 'Data & Analytics').length },
    ];

    return {
      totalCandidates: users.filter((u) => u.role === 'candidate').length,
      totalEmployers: companies.length,
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.status === 'active').length,
      totalApplications: apps.length,
      pendingEmployers: companies.filter((c) => !c.verified).length,
      statusCounts,
      categories,
    };
  },

  getAdminEmployers: async () => {
    return await firestoreService.getCompanies();
  },

  getAdminUsers: async () => {
    return await firestoreService.getAllUsers();
  },

  updateUserStatus: async (userId: string, isBanned: boolean) => {
    const newStatus = isBanned ? 'banned' : 'active';
    await firestoreService.updateUser(userId, { status: newStatus as any });
    const user = await firestoreService.getUser(userId);
    return user!;
  },

  getAdminJobs: async () => {
    return await firestoreService.getJobs();
  },

  approveEmployer: async (companyId: string, verified: boolean) => {
    await updateDoc(doc(db, 'companies', companyId), { verified });
    const comp = await firestoreService.getCompany(companyId);
    return comp!;
  },

  verifyCompany: async (companyId: string, verified: boolean) => {
    await updateDoc(doc(db, 'companies', companyId), { verified });
    const comp = await firestoreService.getCompany(companyId);
    return comp!;
  },

  getCategories: async () => {
    const snap = await getDocs(collection(db, 'categories'));
    if (snap.empty) {
      return [
        { id: 'cat_eng', name: 'Engineering', iconName: 'Code', jobCount: 12 },
        { id: 'cat_design', name: 'Design & Creative', iconName: 'Palette', jobCount: 5 },
        { id: 'cat_prod', name: 'Product Management', iconName: 'Compass', jobCount: 4 },
        { id: 'cat_data', name: 'Data & Analytics', iconName: 'BarChart', jobCount: 7 },
      ];
    }
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PlatformCategory, 'id'>) }));
  },

  createCategory: async (name: string, iconName?: string) => {
    const id = `cat_${Date.now()}`;
    const newCat: PlatformCategory = { id, name, iconName: iconName || 'Folder', jobCount: 0 };
    await setDoc(doc(db, 'categories', id), newCat);
    return newCat;
  },

  getFlaggedContent: async () => {
    const snap = await getDocs(collection(db, 'flagged'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FlaggedContent, 'id'>) }));
  },

  getAdminReports: async () => {
    const snap = await getDocs(collection(db, 'flagged'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FlaggedContent, 'id'>) }));
  },

  updateFlaggedContent: async (id: string, status: 'resolved' | 'dismissed') => {
    await updateDoc(doc(db, 'flagged', id), { status });
    const snap = await getDoc(doc(db, 'flagged', id));
    return { id: snap.id, ...(snap.data() as Omit<FlaggedContent, 'id'>) };
  },

  resolveReport: async (id: string, status: 'resolved' | 'dismissed') => {
    await updateDoc(doc(db, 'flagged', id), { status });
    const snap = await getDoc(doc(db, 'flagged', id));
    return { id: snap.id, ...(snap.data() as Omit<FlaggedContent, 'id'>) };
  },

  reportContent: async (payload: { targetType: string; targetId: string; targetTitle?: string; reason: string }) => {
    const id = `flag_${Date.now()}`;
    const item: FlaggedContent = {
      id,
      targetType: payload.targetType as any,
      targetId: payload.targetId,
      targetTitle: payload.targetTitle || 'Reported Item',
      reportedBy: auth.currentUser?.email || 'Anonymous',
      reason: payload.reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'flagged', id), item);
    return item;
  },
};

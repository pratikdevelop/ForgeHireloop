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
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } else {
      const cachedToken = localStorage.getItem('forgehireloop_token');
      if (cachedToken) headers['Authorization'] = `Bearer ${cachedToken}`;
    }
  } catch {}
  return headers;
}

export const api = {
  // ================= AUTH =================
  register: async (payload: any) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  login: async (payload: { email: string; password: string }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  googleLogin: async (payload: any) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google login failed');
    return data;
  },

  getMe: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/auth/me', { headers });
    if (res.ok) {
      const data = await res.json();
      return { user: data.user, company: data.company };
    }

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
    }
    return { user, company };
  },

  updateProfile: async (updates: Partial<User>) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      return data.user;
    }
    // Fallback direct user update
    if (auth.currentUser) {
      return await firestoreService.setUser(auth.currentUser.uid, updates);
    }
    throw new Error('Not authenticated');
  },

  updateCompanyProfile: async (updates: Partial<Company>) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/companies/my', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      return await res.json();
    }
    if (updates.id) {
      return await firestoreService.setCompany(updates.id, updates);
    }
    throw new Error('Company ID required');
  },

  // ================= PUBLIC READS (FIRESTORE DIRECT READS) =================
  getJobs: async (filters?: {
    search?: string;
    location?: string;
    workplaceType?: string;
    jobType?: string;
    experienceLevel?: string;
    category?: string;
    salaryMin?: number;
    companyId?: string;
  }) => {
    return await firestoreService.getJobs(filters);
  },

  getFeaturedJobs: async () => {
    return await firestoreService.getFeaturedJobs();
  },

  getRecommendedJobs: async () => {
    const allJobs = await firestoreService.getJobs({ status: 'active' });
    return { recommendations: allJobs.slice(0, 6) };
  },

  getJobById: async (id: string) => {
    const job = await firestoreService.getJobById(id);
    if (!job) throw new Error('Job not found');
    return job;
  },

  getMyPostedJobs: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/jobs/employer/mine', { headers });
    if (res.ok) {
      return await res.json();
    }
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    const userDoc = await firestoreService.getUser(currentUser.uid);
    const companyId = userDoc?.companyId;

    if (!companyId) {
      const allJobs = await firestoreService.getJobs();
      return allJobs.filter((j) => j.employerId === currentUser.uid);
    }
    return await firestoreService.getJobs({ companyId });
  },

  // ================= JOB MUTATIONS (EXPRESS SERVER API) =================
  createJob: async (job: Partial<Job>) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers,
      body: JSON.stringify(job),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to post job');
    return data;
  },

  updateJob: async (id: string, updates: Partial<Job>) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update job');
    return data;
  },

  updateJobStatus: async (id: string, payload: { status?: string; renew?: boolean }) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/jobs/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update job status');
    return data;
  },

  deleteJob: async (id: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete job');
    return data;
  },

  toggleSaveJob: async (id: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/jobs/${encodeURIComponent(id)}/save`, {
      method: 'POST',
      headers,
    });
    if (res.ok) {
      return await res.json();
    }
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

  // ================= APPLICATIONS (EXPRESS SERVER API) =================
  applyToJob: async (
    jobId: string,
    payload: { resumeUrl?: string; resumeFileName?: string; coverNote?: string }
  ) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/apply`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit application');
    return data;
  },

  getMyApplications: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/applications/my', { headers });
    if (res.ok) {
      return await res.json();
    }
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    return await firestoreService.getApplicationsForCandidate(currentUser.uid);
  },

  getEmployerApplications: async (params?: { jobId?: string; status?: string; skill?: string }) => {
    const headers = await getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.jobId) query.set('jobId', params.jobId);
    if (params?.status) query.set('status', params.status);
    if (params?.skill) query.set('skill', params.skill);

    const res = await fetch(`/api/applications/employer?${query.toString()}`, { headers });
    if (res.ok) {
      return await res.json();
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    const userDoc = await firestoreService.getUser(currentUser.uid);
    if (!userDoc?.companyId) return [];
    return await firestoreService.getApplicationsForCompany(userDoc.companyId);
  },

  updateApplicationStatus: async (
    id: string,
    payload: {
      status: ApplicationStatus;
      note?: string;
      interviewDate?: string;
      interviewSlots?: any[];
      employerNotes?: string;
    }
  ) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/applications/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update application status');
    return data;
  },

  // ================= RESUME SEARCH (EMPLOYER) =================
  searchCandidates: async (params?: { query?: string; keyword?: string; skill?: string; location?: string; minExperience?: number }) => {
    const headers = await getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.query) query.set('query', params.query);
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.skill) query.set('skill', params.skill);
    if (params?.location) query.set('location', params.location);
    if (params?.minExperience) query.set('minExperience', String(params.minExperience));

    const res = await fetch(`/api/candidates?${query.toString()}`, { headers });
    if (res.ok) {
      return await res.json();
    }

    const users = await firestoreService.getAllUsers();
    let candidates = users.filter((u) => u.role === 'candidate');
    if (params?.skill) {
      const sk = params.skill.toLowerCase();
      candidates = candidates.filter((c) => c.skills?.some((s) => s.toLowerCase().includes(sk)));
    }
    return candidates;
  },

  // ================= COMPANIES (PUBLIC READS) =================
  getCompanies: async (params?: { industry?: string; search?: string }) => {
    return await firestoreService.getCompanies(params);
  },

  getCompanyById: async (id: string) => {
    const comp = await firestoreService.getCompany(id);
    if (!comp) throw new Error('Company not found');
    return comp;
  },

  toggleFollowCompany: async (id: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/companies/${encodeURIComponent(id)}/follow`, {
      method: 'POST',
      headers,
    });
    if (res.ok) {
      return await res.json();
    }
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

  // ================= JOB ALERTS (EXPRESS SERVER API) =================
  getAlerts: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/alerts', { headers });
    if (res.ok) {
      return await res.json();
    }
    return [];
  },

  createAlert: async (alert: Partial<JobAlert>) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers,
      body: JSON.stringify(alert),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create alert');
    return data;
  },

  deleteAlert: async (id: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/alerts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return await res.json();
  },

  // ================= MESSAGES (EXPRESS SERVER API) =================
  getMessages: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/messages', { headers });
    if (res.ok) {
      return await res.json();
    }
    return [];
  },

  sendMessage: async (payload: { recipientId: string; content: string; applicationId?: string; jobId?: string }) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send message');
    return data;
  },

  // ================= ADMIN & MODERATION (EXPRESS SERVER API) =================
  getAdminStats: async (): Promise<AdminStats> => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/stats', { headers });
    if (res.ok) {
      return await res.json();
    }
    const [users, jobs, companies] = await Promise.all([
      firestoreService.getAllUsers(),
      firestoreService.getJobs(),
      firestoreService.getCompanies(),
    ]);

    return {
      totalCandidates: users.filter((u) => u.role === 'candidate').length,
      totalEmployers: companies.length,
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.status === 'active').length,
      totalApplications: 0,
      pendingEmployers: companies.filter((c) => !c.verified).length,
      statusCounts: { applied: 0, viewed: 0, shortlisted: 0, interview: 0, rejected: 0, hired: 0 },
      categories: [],
    };
  },

  getAdminEmployers: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/employers', { headers });
    if (res.ok) return await res.json();
    return await firestoreService.getCompanies();
  },

  getAdminUsers: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/users', { headers });
    if (res.ok) return await res.json();
    return await firestoreService.getAllUsers();
  },

  updateUserStatus: async (userId: string, isBanned: boolean) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: isBanned ? 'banned' : 'active' }),
    });
    if (res.ok) return await res.json();
    return await firestoreService.updateUser(userId, { status: isBanned ? 'banned' : 'active' });
  },

  getAdminJobs: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/jobs', { headers });
    if (res.ok) return await res.json();
    return await firestoreService.getJobs();
  },

  approveEmployer: async (companyId: string, verified: boolean) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/employers/${encodeURIComponent(companyId)}/verify`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ verified }),
    });
    if (res.ok) return await res.json();
    return await firestoreService.setCompany(companyId, { verified });
  },

  verifyCompany: async (companyId: string, verified: boolean) => {
    return api.approveEmployer(companyId, verified);
  },

  getCategories: async () => {
    const res = await fetch('/api/categories');
    if (res.ok) return await res.json();
    return [
      { id: 'cat_eng', name: 'Engineering', iconName: 'Code', jobCount: 12 },
      { id: 'cat_design', name: 'Design & Creative', iconName: 'Palette', jobCount: 5 },
      { id: 'cat_prod', name: 'Product Management', iconName: 'Compass', jobCount: 4 },
      { id: 'cat_data', name: 'Data & Analytics', iconName: 'BarChart', jobCount: 7 },
    ];
  },

  createCategory: async (name: string, iconName?: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, iconName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create category');
    return data;
  },

  getFlaggedContent: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/flagged', { headers });
    if (res.ok) return await res.json();
    return [];
  },

  getAdminReports: async () => {
    return api.getFlaggedContent();
  },

  updateFlaggedContent: async (id: string, status: 'resolved' | 'dismissed') => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/flagged/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    return await res.json();
  },

  resolveReport: async (id: string, status: 'resolved' | 'dismissed') => {
    return api.updateFlaggedContent(id, status);
  },

  reportContent: async (payload: { targetType: string; targetId: string; targetTitle?: string; reason: string }) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/flagged', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return await res.json();
  },
};

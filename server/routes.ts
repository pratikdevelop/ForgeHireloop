import { Router, Response } from 'express';
import { db } from './db';
import {
  AuthRequest,
  generateToken,
  sanitizeUser,
  hashPassword,
  comparePassword,
  requireAuth,
  requireRole,
} from './auth';
import {
  User,
  Company,
  Job,
  Application,
  JobAlert,
  Message,
  FlaggedContent,
  ApplicationStatus,
} from './types';

export const apiRouter = Router();

// ==========================================
// AUTHENTICATION & USER PROFILE
// ==========================================

// Register
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, role, companyName, companyWebsite, companyIndustry, recruiterTitle } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required registration fields' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    let companyId: string | undefined = undefined;

    // If employer, create company or link
    if (role === 'employer') {
      const newCompId = `comp_${Date.now()}`;
      const newCompany: Company = {
        id: newCompId,
        name: companyName || `${name}'s Organization`,
        logoUrl: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=120&auto=format&fit=crop&q=80',
        description: 'New verified employer on ForgeHireloop platform.',
        industry: companyIndustry || 'Technology',
        size: '10-50 employees',
        website: companyWebsite || '',
        location: 'Remote / Global',
        verified: true,
        employerIds: [userId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.createCompany(newCompany);
      companyId = newCompId;
    }

    const newUser: User = {
      id: userId,
      email,
      passwordHash,
      name,
      role,
      status: 'active',
      headline: role === 'candidate' ? 'Job Seeker' : recruiterTitle || 'Talent Specialist',
      photoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      skills: role === 'candidate' ? [] : undefined,
      experience: role === 'candidate' ? [] : undefined,
      education: role === 'candidate' ? [] : undefined,
      savedJobIds: [],
      followedCompanyIds: [],
      companyId,
      recruiterTitle: role === 'employer' ? recruiterTitle || 'Talent Acquisition' : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createUser(newUser);
    const token = generateToken(newUser);

    return res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      company: companyId ? db.getCompanyById(companyId) : undefined,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// Login
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account has been suspended by administration' });
    }

    const token = generateToken(user);
    const company = user.companyId ? db.getCompanyById(user.companyId) : undefined;

    return res.json({
      token,
      user: sanitizeUser(user),
      company,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// Google OAuth simulation login/signup
apiRouter.post('/auth/google', async (req, res) => {
  try {
    const { email, name, photoUrl, role = 'candidate' } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google email is required' });
    }

    let user = db.getUserByEmail(email);
    if (!user) {
      // Create new user via Google
      const userId = `usr_g_${Date.now()}`;
      const defaultHash = await hashPassword('oauth_google_verified');
      user = {
        id: userId,
        email,
        passwordHash: defaultHash,
        name: name || email.split('@')[0],
        role,
        status: 'active',
        headline: role === 'candidate' ? 'Specialist' : 'Recruiter',
        photoUrl: photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
        skills: role === 'candidate' ? ['React', 'JavaScript'] : undefined,
        experience: [],
        education: [],
        savedJobIds: [],
        followedCompanyIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.createUser(user);
    }

    const token = generateToken(user);
    const company = user.companyId ? db.getCompanyById(user.companyId) : undefined;

    return res.json({
      token,
      user: sanitizeUser(user),
      company,
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    return res.status(500).json({ error: 'Google login failed', details: err.message });
  }
});

// Get current user profile
apiRouter.get('/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const company = user.companyId ? db.getCompanyById(user.companyId) : undefined;
  return res.json({
    user: sanitizeUser(user),
    company,
  });
});

// Update Profile
apiRouter.put('/auth/profile', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      name,
      headline,
      phone,
      location,
      bio,
      skills,
      experienceYears,
      experience,
      education,
      photoUrl,
      recruiterTitle,
    } = req.body;

    const updated = db.updateUser(user.id, {
      name: name ?? user.name,
      headline: headline ?? user.headline,
      phone: phone ?? user.phone,
      location: location ?? user.location,
      bio: bio ?? user.bio,
      skills: skills ?? user.skills,
      experienceYears: experienceYears ?? user.experienceYears,
      experience: experience ?? user.experience,
      education: education ?? user.education,
      photoUrl: photoUrl ?? user.photoUrl,
      recruiterTitle: recruiterTitle ?? user.recruiterTitle,
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    const company = updated.companyId ? db.getCompanyById(updated.companyId) : undefined;
    return res.json({
      user: sanitizeUser(updated),
      company,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
});

// Upload resume
apiRouter.post('/auth/resume', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { resumeUrl, resumeFileName } = req.body;

    if (!resumeUrl) {
      return res.status(400).json({ error: 'Resume payload is required' });
    }

    const updated = db.updateUser(user.id, {
      resumeUrl,
      resumeFileName: resumeFileName || 'Resume.pdf',
      resumeUploadedAt: new Date().toISOString(),
    });

    return res.json({
      message: 'Resume uploaded successfully',
      user: sanitizeUser(updated!),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to upload resume', details: err.message });
  }
});

// ==========================================
// JOBS BROWSING, SEARCH & MANAGEMENT
// ==========================================

// Search / list jobs
apiRouter.get('/jobs', (req, res) => {
  try {
    const {
      search,
      location,
      jobType,
      workplaceType,
      experienceLevel,
      industry,
      category,
      minSalary,
      maxSalary,
      companyId,
      sortBy = 'recent',
    } = req.query as Record<string, string>;

    let jobs = db.getJobs();

    // Only return active jobs unless querying specifically for employer
    if (!companyId) {
      jobs = jobs.filter(j => j.status === 'active');
    } else {
      jobs = jobs.filter(j => j.companyId === companyId);
    }

    // Full-text search
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      jobs = jobs.filter(j => {
        const titleMatch = j.title.toLowerCase().includes(q);
        const descMatch = j.description.toLowerCase().includes(q);
        const skillMatch = j.skills.some(s => s.toLowerCase().includes(q));
        const compMatch = j.company?.name.toLowerCase().includes(q);
        const reqMatch = j.requirements.some(r => r.toLowerCase().includes(q));
        return titleMatch || descMatch || skillMatch || compMatch || reqMatch;
      });
    }

    // Location filter
    if (location && location.trim() && location.toLowerCase() !== 'all') {
      const loc = location.toLowerCase().trim();
      jobs = jobs.filter(j => {
        const locMatch = j.location.toLowerCase().includes(loc);
        const remoteMatch = loc === 'remote' && (j.workplaceType === 'remote' || j.location.toLowerCase().includes('remote'));
        return locMatch || remoteMatch;
      });
    }

    // Filters
    if (jobType && jobType !== 'all') {
      jobs = jobs.filter(j => j.jobType.toLowerCase() === jobType.toLowerCase());
    }
    if (workplaceType && workplaceType !== 'all') {
      jobs = jobs.filter(j => j.workplaceType.toLowerCase() === workplaceType.toLowerCase());
    }
    if (experienceLevel && experienceLevel !== 'all') {
      jobs = jobs.filter(j => j.experienceLevel.toLowerCase() === experienceLevel.toLowerCase());
    }
    if (industry && industry !== 'all') {
      jobs = jobs.filter(j => j.industry.toLowerCase() === industry.toLowerCase());
    }
    if (category && category !== 'all') {
      jobs = jobs.filter(j => j.category.toLowerCase() === category.toLowerCase());
    }
    if (minSalary) {
      const min = Number(minSalary);
      if (!isNaN(min) && min > 0) {
        jobs = jobs.filter(j => (j.salaryMax || j.salaryMin || 0) >= min);
      }
    }

    // Sorting
    if (sortBy === 'salary') {
      jobs.sort((a, b) => (b.salaryMax || b.salaryMin || 0) - (a.salaryMax || a.salaryMin || 0));
    } else if (sortBy === 'views') {
      jobs.sort((a, b) => b.viewsCount - a.viewsCount);
    } else {
      // recent
      jobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    }

    return res.json({
      count: jobs.length,
      jobs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch jobs', details: err.message });
  }
});

// Job recommendations for candidate
apiRouter.get('/jobs/recommendations', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const candidateSkills = (user.skills || []).map(s => s.toLowerCase());
    let jobs = db.getJobs().filter(j => j.status === 'active');

    // Score jobs by skill matches and candidate experience
    const scoredJobs = jobs.map(job => {
      let score = 0;
      const jobSkills = job.skills.map(s => s.toLowerCase());
      
      jobSkills.forEach(js => {
        if (candidateSkills.includes(js)) {
          score += 3;
        }
      });

      if (user.location && job.location.toLowerCase().includes(user.location.toLowerCase())) {
        score += 2;
      }
      if (job.workplaceType === 'remote') {
        score += 1;
      }

      return { job, score };
    });

    scoredJobs.sort((a, b) => b.score - a.score);
    const recommended = scoredJobs.slice(0, 6).map(s => s.job);

    return res.json({ recommendations: recommended });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to get recommendations', details: err.message });
  }
});

// Get job details & increment view
apiRouter.get('/jobs/:id', (req, res) => {
  try {
    const job = db.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Increment view count
    db.updateJob(job.id, { viewsCount: (job.viewsCount || 0) + 1 });

    return res.json(db.getJobById(job.id));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch job details', details: err.message });
  }
});

// Get all jobs posted by current employer
apiRouter.get('/jobs/employer/mine', requireAuth, requireRole(['employer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let jobs = db.getJobs();
    if (user.role === 'employer' && user.companyId) {
      jobs = jobs.filter(j => j.companyId === user.companyId);
    }
    return res.json(jobs);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch employer jobs', details: err.message });
  }
});

// Post a new job (Employer only)
apiRouter.post('/jobs', requireAuth, requireRole(['employer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.companyId && user.role !== 'admin') {
      return res.status(400).json({ error: 'Employer must be associated with a company to post jobs' });
    }

    const {
      title,
      description,
      requirements = [],
      responsibilities = [],
      skills = [],
      location,
      workplaceType = 'remote',
      jobType = 'full-time',
      experienceLevel = 'mid',
      minExperienceYears = 2,
      salaryMin,
      salaryMax,
      salaryCurrency = 'USD',
      salaryPeriod = 'yearly',
      industry = 'Software & Technology',
      category = 'Engineering',
      companyId: customCompanyId,
    } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({ error: 'Title, description, and location are required' });
    }

    const assignedCompanyId = user.role === 'admin' && customCompanyId ? customCompanyId : user.companyId!;
    const jobId = `job_${Date.now()}`;

    const newJob: Job = {
      id: jobId,
      companyId: assignedCompanyId,
      employerId: user.id,
      title,
      description,
      requirements: Array.isArray(requirements) ? requirements : [requirements],
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [responsibilities],
      skills: Array.isArray(skills) ? skills : [skills],
      location,
      workplaceType,
      jobType,
      experienceLevel,
      minExperienceYears: Number(minExperienceYears) || 0,
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      salaryMax: salaryMax ? Number(salaryMax) : undefined,
      salaryCurrency,
      salaryPeriod,
      industry,
      category,
      status: 'active',
      viewsCount: 0,
      applicantCount: 0,
      postedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = db.createJob(newJob);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to post job', details: err.message });
  }
});

// Edit job (Employer only)
apiRouter.put('/jobs/:id', requireAuth, requireRole(['employer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const job = db.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Verify ownership
    if (user.role !== 'admin' && job.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Unauthorized to edit this job posting' });
    }

    const updated = db.updateJob(job.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update job', details: err.message });
  }
});

// Update job status (close, renew, active)
apiRouter.patch('/jobs/:id/status', requireAuth, requireRole(['employer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const job = db.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (user.role !== 'admin' && job.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Unauthorized to modify this job' });
    }

    const { status, renew } = req.body;
    const updates: Partial<Job> = {};

    if (status) {
      updates.status = status;
    }
    if (renew) {
      updates.postedAt = new Date().toISOString();
      updates.status = 'active';
    }

    const updated = db.updateJob(job.id, updates);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update job status', details: err.message });
  }
});

// Delete job
apiRouter.delete('/jobs/:id', requireAuth, requireRole(['employer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const job = db.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (user.role !== 'admin' && job.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Unauthorized to delete this job' });
    }

    db.deleteJob(job.id);
    return res.json({ message: 'Job deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete job', details: err.message });
  }
});

// Bookmark / save job
apiRouter.post('/jobs/:id/save', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const saved = user.savedJobIds || [];
    const jobId = req.params.id;
    let newSaved: string[];

    if (saved.includes(jobId)) {
      newSaved = saved.filter(id => id !== jobId);
    } else {
      newSaved = [...saved, jobId];
    }

    const updated = db.updateUser(user.id, { savedJobIds: newSaved });
    return res.json({ savedJobIds: updated?.savedJobIds || [] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update saved jobs', details: err.message });
  }
});

// ==========================================
// APPLICATIONS (CANDIDATE & EMPLOYER)
// ==========================================

// Apply to a job (Candidate one-click apply)
apiRouter.post('/jobs/:id/apply', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== 'candidate') {
      return res.status(400).json({ error: 'Only job seekers can apply to jobs' });
    }

    const job = db.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if already applied
    const existing = db.getApplications().find(
      a => a.jobId === job.id && a.candidateId === user.id
    );
    if (existing) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    const { resumeUrl, resumeFileName, coverNote } = req.body;
    const finalResumeUrl = resumeUrl || user.resumeUrl;
    const finalResumeName = resumeFileName || user.resumeFileName || 'Resume.pdf';

    const appId = `app_${Date.now()}`;
    const newApplication: Application = {
      id: appId,
      jobId: job.id,
      candidateId: user.id,
      companyId: job.companyId,
      resumeUrl: finalResumeUrl,
      resumeFileName: finalResumeName,
      coverNote: coverNote || '',
      status: 'applied',
      statusHistory: [
        {
          status: 'applied',
          timestamp: new Date().toISOString(),
          note: 'Application submitted successfully',
        },
      ],
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = db.createApplication(newApplication);

    // If user uploaded a new resume during application, update user profile resume too
    if (resumeUrl && resumeUrl !== user.resumeUrl) {
      db.updateUser(user.id, {
        resumeUrl,
        resumeFileName: finalResumeName,
        resumeUploadedAt: new Date().toISOString(),
      });
    }

    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit application', details: err.message });
  }
});

// Candidate view my applications
apiRouter.get('/applications/my', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const apps = db.getApplications().filter(a => a.candidateId === user.id);
    return res.json(apps);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch applications', details: err.message });
  }
});

// Employer view applicants
apiRouter.get('/applications/employer', requireAuth, requireRole(['employer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { jobId, status, skill } = req.query as Record<string, string>;

    let apps = db.getApplications();

    if (user.role !== 'admin') {
      apps = apps.filter(a => a.companyId === user.companyId);
    }

    if (jobId) {
      apps = apps.filter(a => a.jobId === jobId);
    }
    if (status && status !== 'all') {
      apps = apps.filter(a => a.status === status);
    }
    if (skill) {
      const s = skill.toLowerCase();
      apps = apps.filter(a => a.candidate?.skills?.some(item => item.toLowerCase().includes(s)));
    }

    return res.json(apps);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch applicants', details: err.message });
  }
});

// Update application status (shortlist, reject, interview, hire)
apiRouter.patch('/applications/:id/status', requireAuth, requireRole(['employer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const app = db.getApplicationById(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (user.role !== 'admin' && app.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Unauthorized to update this application' });
    }

    const { status, note, interviewDate, employerNotes } = req.body as {
      status: ApplicationStatus;
      note?: string;
      interviewDate?: string;
      employerNotes?: string;
    };

    const newHistory = [
      ...app.statusHistory,
      {
        status,
        timestamp: new Date().toISOString(),
        note: note || `Status updated to ${status}`,
      },
    ];

    const updated = db.updateApplication(app.id, {
      status,
      statusHistory: newHistory,
      interviewDate: interviewDate !== undefined ? interviewDate : app.interviewDate,
      employerNotes: employerNotes !== undefined ? employerNotes : app.employerNotes,
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update application status', details: err.message });
  }
});

// ==========================================
// RESUME DATABASE SEARCH (EMPLOYER)
// ==========================================

apiRouter.get('/candidates/search', requireAuth, requireRole(['employer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const { query, skill, location, minExperience } = req.query as Record<string, string>;

    let candidates = db.getUsers().filter(u => u.role === 'candidate' && u.status === 'active');

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      candidates = candidates.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(q);
        const headlineMatch = c.headline?.toLowerCase().includes(q);
        const bioMatch = c.bio?.toLowerCase().includes(q);
        const skillMatch = c.skills?.some(s => s.toLowerCase().includes(q));
        return nameMatch || headlineMatch || bioMatch || skillMatch;
      });
    }

    if (skill && skill.trim()) {
      const s = skill.toLowerCase().trim();
      candidates = candidates.filter(c => c.skills?.some(sk => sk.toLowerCase().includes(s)));
    }

    if (location && location.trim()) {
      const loc = location.toLowerCase().trim();
      candidates = candidates.filter(c => c.location?.toLowerCase().includes(loc));
    }

    if (minExperience) {
      const exp = Number(minExperience);
      if (!isNaN(exp)) {
        candidates = candidates.filter(c => (c.experienceYears || 0) >= exp);
      }
    }

    const sanitized = candidates.map(sanitizeUser);
    return res.json(sanitized);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to search candidates', details: err.message });
  }
});

// ==========================================
// COMPANIES & FOLLOW
// ==========================================

apiRouter.get('/companies', (req, res) => {
  try {
    const companies = db.getCompanies();
    const jobs = db.getJobs().filter(j => j.status === 'active');

    const enriched = companies.map(comp => {
      const activeJobsCount = jobs.filter(j => j.companyId === comp.id).length;
      return {
        ...comp,
        activeJobsCount,
      };
    });

    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch companies', details: err.message });
  }
});

apiRouter.get('/companies/:id', (req, res) => {
  try {
    const company = db.getCompanyById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const jobs = db.getJobs().filter(j => j.companyId === company.id && j.status === 'active');
    return res.json({ ...company, jobs });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch company', details: err.message });
  }
});

// Update company profile
apiRouter.put('/companies/:id', requireAuth, requireRole(['employer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const company = db.getCompanyById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (user.role !== 'admin' && user.companyId !== company.id) {
      return res.status(403).json({ error: 'Unauthorized to edit company' });
    }

    const updated = db.updateCompany(company.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update company', details: err.message });
  }
});

// Follow / unfollow company
apiRouter.post('/companies/:id/follow', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const compId = req.params.id;
    const followed = user.followedCompanyIds || [];
    let newFollowed: string[];

    if (followed.includes(compId)) {
      newFollowed = followed.filter(id => id !== compId);
    } else {
      newFollowed = [...followed, compId];
    }

    const updated = db.updateUser(user.id, { followedCompanyIds: newFollowed });
    return res.json({ followedCompanyIds: updated?.followedCompanyIds || [] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update follow status', details: err.message });
  }
});

// ==========================================
// JOB ALERTS
// ==========================================

apiRouter.get('/alerts', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const alerts = db.getAlerts(req.user!.id);
    return res.json(alerts);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch alerts', details: err.message });
  }
});

apiRouter.post('/alerts', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { title, keywords, location, industry, jobType, minSalary, frequency = 'daily' } = req.body;

    const newAlert: JobAlert = {
      id: `alert_${Date.now()}`,
      candidateId: user.id,
      title: title || `${keywords || 'Job'} Alert`,
      keywords: keywords || '',
      location,
      industry,
      jobType,
      minSalary: minSalary ? Number(minSalary) : undefined,
      frequency,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const created = db.createAlert(newAlert);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create alert', details: err.message });
  }
});

apiRouter.delete('/alerts/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const deleted = db.deleteAlert(req.params.id, req.user!.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    return res.json({ message: 'Alert deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete alert', details: err.message });
  }
});

// ==========================================
// MESSAGING (CANDIDATE & EMPLOYER)
// ==========================================

apiRouter.get('/messages', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const messages = db.getMessages(user.id);
    return res.json(messages);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
});

apiRouter.post('/messages', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { recipientId, content, applicationId, jobId } = req.body;

    if (!recipientId || !content || !content.trim()) {
      return res.status(400).json({ error: 'Recipient and content are required' });
    }

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      applicationId,
      jobId,
      senderId: user.id,
      recipientId,
      senderName: user.name,
      senderRole: user.role,
      content: content.trim(),
      read: false,
      createdAt: new Date().toISOString(),
    };

    const created = db.createMessage(newMessage);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
});

// ==========================================
// ADMIN DASHBOARD & PLATFORM MANAGEMENT
// ==========================================

apiRouter.get('/admin/stats', requireAuth, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  try {
    const users = db.getUsers();
    const jobs = db.getJobs();
    const apps = db.getApplications();
    const companies = db.getCompanies();

    const totalCandidates = users.filter(u => u.role === 'candidate').length;
    const totalEmployers = users.filter(u => u.role === 'employer').length;
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'active').length;
    const totalApplications = apps.length;
    const pendingEmployers = companies.filter(c => !c.verified).length;

    // Applications by status
    const statusCounts: Record<string, number> = {
      applied: 0,
      viewed: 0,
      shortlisted: 0,
      interview: 0,
      rejected: 0,
      hired: 0,
    };
    apps.forEach(a => {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      }
    });

    // Top categories
    const categories = db.getCategories();

    return res.json({
      totalCandidates,
      totalEmployers,
      totalJobs,
      activeJobs,
      totalApplications,
      pendingEmployers,
      statusCounts,
      categories,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch admin stats', details: err.message });
  }
});

apiRouter.get('/admin/employers', requireAuth, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  try {
    const companies = db.getCompanies();
    const users = db.getUsers().filter(u => u.role === 'employer');

    const result = companies.map(comp => {
      const employerUsers = users.filter(u => u.companyId === comp.id);
      return {
        ...comp,
        recruiters: employerUsers.map(sanitizeUser),
      };
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch employers', details: err.message });
  }
});

// Admin Users Management
apiRouter.get('/admin/users', requireAuth, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  try {
    const users = db.getUsers();
    return res.json(users.map(u => ({ ...sanitizeUser(u), isBanned: u.status === 'suspended' || u.status === 'banned' })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

apiRouter.patch('/admin/users/:id/status', requireAuth, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  try {
    const { isBanned } = req.body;
    const newStatus = isBanned ? 'banned' : 'active';
    const updated = db.updateUser(req.params.id, { status: newStatus as any });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ ...sanitizeUser(updated), isBanned: updated.status === 'banned' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update user status', details: err.message });
  }
});

// Admin All Jobs Management
apiRouter.get('/admin/jobs', requireAuth, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  try {
    const jobs = db.getJobs();
    return res.json(jobs);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch jobs', details: err.message });
  }
});

apiRouter.patch('/admin/employers/:id/approve', requireAuth, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  try {
    const { verified } = req.body;
    const company = db.updateCompany(req.params.id, { verified: Boolean(verified) });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    return res.json(company);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update approval status', details: err.message });
  }
});

apiRouter.get('/admin/categories', (req, res) => {
  return res.json(db.getCategories());
});

apiRouter.post('/admin/categories', requireAuth, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  try {
    const { name, iconName = 'Briefcase' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const cat = db.addCategory({
      id: `cat_${Date.now()}`,
      name,
      iconName,
      jobCount: 0,
    });
    return res.status(201).json(cat);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add category', details: err.message });
  }
});

apiRouter.get('/admin/flagged', requireAuth, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  return res.json(db.getFlagged());
});

apiRouter.patch('/admin/flagged/:id/action', requireAuth, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const updated = db.updateFlagged(req.params.id, status);
  if (!updated) {
    return res.status(404).json({ error: 'Flagged item not found' });
  }
  return res.json(updated);
});

apiRouter.post('/admin/flagged', (req, res) => {
  const { targetType, targetId, targetTitle, reportedBy, reason } = req.body;
  const flag: FlaggedContent = {
    id: `flag_${Date.now()}`,
    targetType,
    targetId,
    targetTitle: targetTitle || 'Reported Content',
    reportedBy: reportedBy || 'User Report',
    reason: reason || 'Inappropriate content',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const created = db.createFlag(flag);
  return res.status(201).json(created);
});

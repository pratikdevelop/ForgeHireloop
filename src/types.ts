export type UserRole = 'candidate' | 'employer' | 'admin';

export type UserStatus = 'active' | 'pending_approval' | 'suspended' | 'banned';

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  startYear: string;
  endYear: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  headline?: string;
  photoUrl?: string;
  phone?: string;
  location?: string;
  bio?: string;
  
  // Candidate-specific
  skills?: string[];
  experienceYears?: number;
  experience?: ExperienceItem[];
  education?: EducationItem[];
  resumeUrl?: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  savedJobIds?: string[];
  followedCompanyIds?: string[];
  
  // Employer-specific
  companyId?: string;
  recruiterTitle?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  logoUrl: string;
  bannerUrl?: string;
  description: string;
  industry: string;
  size: string;
  website: string;
  location: string;
  verified: boolean;
  foundedYear?: number;
  employerIds: string[];
  activeJobsCount?: number;
  jobs?: Job[];
  recruiters?: Partial<User>[];
  createdAt: string;
  updatedAt: string;
}

export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';
export type WorkplaceType = 'remote' | 'onsite' | 'hybrid';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
export type JobStatus = 'active' | 'closed' | 'draft';

export interface Job {
  id: string;
  companyId: string;
  employerId: string;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  location: string;
  workplaceType: WorkplaceType;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  minExperienceYears: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  salaryPeriod: 'yearly' | 'monthly' | 'hourly';
  industry: string;
  category: string;
  status: JobStatus;
  viewsCount: number;
  applicantCount: number;
  postedAt: string;
  expiresAt?: string;
  updatedAt: string;
  company?: Company;
}

export type ApplicationStatus = 'applied' | 'viewed' | 'shortlisted' | 'interview' | 'rejected' | 'hired';

export interface InterviewSlot {
  id: string;
  dateTime: string;
  durationMinutes: number;
  meetingLink?: string;
  notes?: string;
  status: 'suggested' | 'accepted' | 'declined' | 'rescheduled';
}

export interface StatusHistoryItem {
  status: ApplicationStatus;
  timestamp: string;
  note?: string;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  companyId: string;
  resumeUrl?: string;
  resumeFileName?: string;
  coverNote?: string;
  status: ApplicationStatus;
  statusHistory: StatusHistoryItem[];
  employerNotes?: string;
  interviewDate?: string;
  interviewSlots?: InterviewSlot[];
  appliedAt: string;
  updatedAt: string;
  job?: Job;
  candidate?: Partial<User>;
  company?: Company;
}

export interface JobAlert {
  id: string;
  candidateId: string;
  title: string;
  keywords: string;
  location?: string;
  industry?: string;
  jobType?: JobType;
  minSalary?: number;
  frequency: 'daily' | 'weekly';
  active: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  applicationId?: string;
  jobId?: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface PlatformCategory {
  id: string;
  name: string;
  iconName: string;
  jobCount: number;
}

export interface FlaggedContent {
  id: string;
  targetType: 'job' | 'employer' | 'user';
  targetId: string;
  targetTitle: string;
  reportedBy: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface AdminStats {
  totalCandidates: number;
  totalEmployers: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  pendingEmployers: number;
  statusCounts: Record<ApplicationStatus, number>;
  categories: PlatformCategory[];
}

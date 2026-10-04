import {
  Briefcase,
  Search,
  Building2,
  Bookmark,
  Sparkles,
  Users,
  ShieldCheck,
  BarChart3,
  FileCheck,
  Layers,
  LucideIcon,
} from 'lucide-react';
import { UserRole } from '../types';

export type NavRole = UserRole | 'guest';

export interface NavItemConfig {
  id: string; // The view identifier, e.g. 'jobs', 'recruiter-dashboard', 'admin'
  label: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
}

/**
 * Navigation Configuration Object / Map keyed by role
 * Enforces strict role-based presentation across desktop and mobile navigation
 */
export const ROLE_NAVIGATION_CONFIG: Record<NavRole, NavItemConfig[]> = {
  guest: [
    { id: 'jobs', label: 'Find Jobs', icon: Search },
    { id: 'companies', label: 'Companies', icon: Building2 },
  ],
  candidate: [
    { id: 'jobs', label: 'Find Jobs', icon: Search },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'recommended', label: 'For You', icon: Sparkles },
    { id: 'my-applications', label: 'My Applications', icon: FileCheck },
    { id: 'saved', label: 'Saved Jobs', icon: Bookmark },
  ],
  employer: [
    { id: 'recruiter-dashboard', label: 'Dashboard', icon: Briefcase },
    { id: 'manage-jobs', label: 'Manage Jobs', icon: Briefcase },
    { id: 'view-applicants', label: 'View Applicants', icon: Users },
    { id: 'resume-database', label: 'Search Resumes', icon: Search },
    { id: 'companies', label: 'Company Profile', icon: Building2 },
  ],
  admin: [
    { id: 'admin', label: 'Admin Console', icon: ShieldCheck },
    { id: 'approve-employers', label: 'Employer Approvals', icon: Users },
    { id: 'manage-categories', label: 'Categories', icon: Layers },
    { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
    { id: 'companies', label: 'Companies', icon: Building2 },
  ],
};

/**
 * Default view destinations per role
 */
export const ROLE_DEFAULT_VIEWS: Record<NavRole, string> = {
  guest: 'jobs',
  candidate: 'jobs',
  employer: 'recruiter-dashboard',
  admin: 'admin',
};

/**
 * Determine default route / landing view for a role
 */
export function getDefaultViewForRole(role?: UserRole | null): string {
  if (role === 'employer') return ROLE_DEFAULT_VIEWS.employer;
  if (role === 'admin') return ROLE_DEFAULT_VIEWS.admin;
  return ROLE_DEFAULT_VIEWS.candidate;
}

/**
 * Route permissions dictionary mapping view IDs to permitted user roles
 */
export const ROUTE_PERMISSIONS: Record<string, { allowedRoles: UserRole[]; allowGuest?: boolean }> = {
  // Employer / Recruiter routes
  'recruiter-dashboard': { allowedRoles: ['employer'] },
  'post-job': { allowedRoles: ['employer'] },
  'manage-jobs': { allowedRoles: ['employer'] },
  'view-applicants': { allowedRoles: ['employer'] },
  'recruiter-applicants': { allowedRoles: ['employer'] },
  'interviews': { allowedRoles: ['employer'] },
  'salary-trends': { allowedRoles: ['employer'] },
  'resume-database': { allowedRoles: ['employer'] },
  'employer': { allowedRoles: ['employer'] },

  // Admin routes
  'admin': { allowedRoles: ['admin'] },
  'approve-employers': { allowedRoles: ['admin'] },
  'manage-categories': { allowedRoles: ['admin'] },
  'analytics': { allowedRoles: ['admin'] },
  'moderation': { allowedRoles: ['admin'] },

  // Candidate routes
  'jobs': { allowedRoles: ['candidate'], allowGuest: true },
  'my-applications': { allowedRoles: ['candidate'], allowGuest: false },
  'applications': { allowedRoles: ['candidate'], allowGuest: false },
  'saved': { allowedRoles: ['candidate'], allowGuest: false },
  'recommended': { allowedRoles: ['candidate'], allowGuest: false },

  // Shared routes
  'companies': { allowedRoles: ['candidate', 'employer', 'admin'], allowGuest: true },
};

/**
 * Check whether a view route is authorized for a given user role
 */
export function isRouteAuthorized(route: string, role?: UserRole | null): boolean {
  const perm = ROUTE_PERMISSIONS[route];
  if (!perm) return true; // Unrestricted if not specified
  if (!role) return Boolean(perm.allowGuest);
  return perm.allowedRoles.includes(role);
}

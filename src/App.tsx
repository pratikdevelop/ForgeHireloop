import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { JobDetailModal } from './components/JobDetailModal';
import { ApplyModal } from './components/ApplyModal';
import { PostJobModal } from './components/PostJobModal';
import { CandidateProfileModal } from './components/CandidateProfileModal';
import { JobAlertsModal } from './components/JobAlertsModal';
import { MessagesModal } from './components/MessagesModal';
import { RoleGuard } from './components/RoleGuard';
import { JobsView } from './views/JobsView';
import { MyApplicationsView } from './views/MyApplicationsView';
import { CompaniesView } from './views/CompaniesView';
import { EmployerDashboardView } from './views/EmployerDashboardView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { Job, UserRole } from './types';
import { api } from './api/client';
import { getDefaultViewForRole, isRouteAuthorized } from './config/navigation';
import { SEOHead } from './components/SEOHead';
import { BRAND } from './config/brand';
import { CheckCircle2, Briefcase } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Navigation State
  const [currentView, setCurrentView] = useState<string>('jobs');
  const [hasInitializedView, setHasInitializedView] = useState(false);

  // Modal States
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobToApply, setJobToApply] = useState<Job | null>(null);
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [messagesModalOpen, setMessagesModalOpen] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<{ id?: string; name?: string }>({});

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Track applied jobs locally for immediate UI update
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);

  // 1. Initial view initialization on boot / session hydration
  useEffect(() => {
    if (!isLoading && !hasInitializedView) {
      setCurrentView(getDefaultViewForRole(user?.role));
      setHasInitializedView(true);
    }
  }, [isLoading, hasInitializedView, user?.role]);

  // 2. Automatically update view when user role changes or logs in/out
  useEffect(() => {
    if (!isLoading && hasInitializedView) {
      if (!isRouteAuthorized(currentView, user?.role)) {
        setCurrentView(getDefaultViewForRole(user?.role));
      }
    }

    if (user && user.role === 'candidate') {
      // Load user's applications
      api.getMyApplications()
        .then(apps => {
          setAppliedJobIds(apps.map(a => a.jobId));
        })
        .catch(() => {});
    }
  }, [user?.role, isLoading, hasInitializedView]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (role: UserRole) => {
    const target = getDefaultViewForRole(role);
    setCurrentView(target);
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
  };

  const handleStartApply = (job: Job) => {
    if (!isAuthenticated) {
      handleOpenAuth('login');
      return;
    }
    setJobToApply(job);
  };

  const handleApplicationSuccess = (jobId: string) => {
    setAppliedJobIds(prev => [...prev, jobId]);
    showToast('Your application was submitted directly to the hiring team!');
    if (selectedJob?.id === jobId) {
      setSelectedJob(null);
    }
  };

  const handleOpenPostJob = (job?: Job) => {
    if (!isAuthenticated) {
      handleOpenAuth('login');
      return;
    }
    setJobToEdit(job || null);
    setPostJobOpen(true);
  };

  const handleOpenMessages = (recipientId?: string, recipientName?: string) => {
    setMessageRecipient({ id: recipientId, name: recipientName });
    setMessagesModalOpen(true);
  };

  const getSEOProps = () => {
    if (selectedJob) {
      const companyName = selectedJob.company?.name || 'Tech Company';
      const truncatedTitle = selectedJob.title.length > 30 ? selectedJob.title.substring(0, 27) + '...' : selectedJob.title;
      const title = `${truncatedTitle} at ${companyName} | ForgeHireloop`;
      const salaryText = selectedJob.salaryMax ? ` with salary up to $${Math.round(selectedJob.salaryMax / 1000)}k` : '';
      const description = `${companyName} is hiring a ${selectedJob.title} in ${selectedJob.location}${salaryText}. Apply now on ForgeHireloop.`.substring(0, 154);
      return {
        title: title.length > 60 ? title.substring(0, 57) + '...' : title,
        description,
        canonicalUrl: `https://forgehireloop.com/jobs/${selectedJob.id}`,
        ogImage: selectedJob.company?.logoUrl || BRAND.socialShareImage,
        job: selectedJob,
      };
    }

    switch (currentView) {
      case 'companies':
        return {
          title: 'Top Tech Companies & Cultures | ForgeHireloop',
          description: 'Explore leading technology companies, remote engineering cultures, team sizes, and open job listings on ForgeHireloop.',
          canonicalUrl: 'https://forgehireloop.com/companies',
        };
      case 'applications':
        return {
          title: 'My Job Applications | ForgeHireloop',
          description: 'Track your submitted job applications, review recruiter responses, and manage scheduled technical interviews.',
          canonicalUrl: 'https://forgehireloop.com/applications',
        };
      case 'employer-dashboard':
        return {
          title: 'Recruiter & Hiring Portal | ForgeHireloop',
          description: 'Publish active job postings, evaluate candidate resumes, and coordinate engineering hiring pipelines.',
          canonicalUrl: 'https://forgehireloop.com/employer',
        };
      case 'admin-dashboard':
        return {
          title: 'Admin Operations & Moderation | ForgeHireloop',
          description: 'Platform integrity management, employer verification, and global listings moderation for ForgeHireloop.',
          canonicalUrl: 'https://forgehireloop.com/admin',
        };
      case 'jobs':
      default:
        return {
          title: 'Find Tech Jobs & Engineering Careers | ForgeHireloop',
          description: 'Search 1,000+ top software engineering, AI, product & leadership opportunities. Connect directly with hiring teams on ForgeHireloop.',
          canonicalUrl: 'https://forgehireloop.com/',
        };
    }
  };

  // Prevent flash of wrong screen while restoring authentication session
  if (isLoading && !hasInitializedView) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <SEOHead
          title="ForgeHireloop - Find Tech Jobs & Hire Exceptional Engineers"
          description="Search 1,000+ top engineering, AI, product & leadership roles. Connect directly with hiring teams on ForgeHireloop."
        />
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="text-2xl font-bold tracking-tight text-white block">ForgeHireloop</span>
            <span className="text-xs text-slate-400">Loading workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Dynamic SEO Head with Google JobPosting Schema */}
      <SEOHead {...getSEOProps()} />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-300 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Global Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={view => setCurrentView(view)}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenPostJob={() => handleOpenPostJob()}
        onOpenAlerts={() => setAlertsModalOpen(true)}
        onOpenMessages={() => handleOpenMessages()}
      />

      {/* Main View Area with Strict Code-Level RoleGuards */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Jobs View (All, Recommended, Saved) - Candidate & Guest */}
        {(currentView === 'jobs' || currentView === 'recommended' || currentView === 'saved') && (
          <RoleGuard
            allowedRoles={['candidate']}
            allowGuest={currentView === 'jobs'}
            onRedirect={setCurrentView}
          >
            <JobsView
              key={currentView}
              initialTab={
                currentView === 'recommended'
                  ? 'recommended'
                  : currentView === 'saved'
                  ? 'saved'
                  : 'all'
              }
              onSelectJob={handleSelectJob}
              onApplyJob={handleStartApply}
              appliedJobIds={appliedJobIds}
            />
          </RoleGuard>
        )}

        {/* Candidate Applications Tracking */}
        {(currentView === 'applications' || currentView === 'my-applications') && (
          <RoleGuard
            allowedRoles={['candidate']}
            allowGuest={false}
            onRedirect={setCurrentView}
          >
            <MyApplicationsView
              onOpenMessages={handleOpenMessages}
              onExploreJobs={() => setCurrentView('jobs')}
            />
          </RoleGuard>
        )}

        {/* Companies Directory (Accessible across roles) */}
        {currentView === 'companies' && (
          <RoleGuard
            allowedRoles={['candidate', 'employer', 'admin']}
            allowGuest={true}
            onRedirect={setCurrentView}
          >
            <CompaniesView
              onSelectJob={handleSelectJob}
              onApplyJob={handleStartApply}
            />
          </RoleGuard>
        )}

        {/* Employer / Recruiter Portal */}
        {(currentView === 'recruiter-dashboard' ||
          currentView === 'manage-jobs' ||
          currentView === 'view-applicants' ||
          currentView === 'recruiter-applicants' ||
          currentView === 'resume-database' ||
          currentView === 'post-job' ||
          currentView === 'employer') && (
          <RoleGuard
            allowedRoles={['employer']}
            allowGuest={false}
            onRedirect={setCurrentView}
          >
            <EmployerDashboardView
              key={currentView}
              initialTab={
                currentView === 'recruiter-applicants' || currentView === 'view-applicants'
                  ? 'applicants'
                  : currentView === 'resume-database'
                  ? 'resumes'
                  : 'jobs'
              }
              onOpenPostJob={handleOpenPostJob}
              onOpenMessages={handleOpenMessages}
            />
          </RoleGuard>
        )}

        {/* Admin Dashboard */}
        {(currentView === 'admin' ||
          currentView === 'approve-employers' ||
          currentView === 'manage-categories' ||
          currentView === 'analytics' ||
          currentView === 'moderation') && (
          <RoleGuard
            allowedRoles={['admin']}
            allowGuest={false}
            onRedirect={setCurrentView}
          >
            <AdminDashboardView
              key={currentView}
              initialTab={
                currentView === 'approve-employers'
                  ? 'companies'
                  : currentView === 'analytics'
                  ? 'overview'
                  : currentView === 'moderation'
                  ? 'reports'
                  : currentView === 'manage-categories'
                  ? 'jobs'
                  : 'overview'
              }
            />
          </RoleGuard>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">ForgeHireloop</span>
            <span>• The modern ecosystem for candidates and hiring teams</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView(getDefaultViewForRole(user?.role))}
              className="hover:text-blue-600 transition"
            >
              Home
            </button>
            <button
              onClick={() => setCurrentView('companies')}
              className="hover:text-blue-600 transition"
            >
              Companies
            </button>
            {user?.role === 'candidate' && (
              <button
                onClick={() => setAlertsModalOpen(true)}
                className="hover:text-blue-600 transition"
              >
                Job Alerts
              </button>
            )}
            {user?.role === 'admin' && (
              <button
                onClick={() => setCurrentView('admin')}
                className="hover:text-purple-600 transition"
              >
                Admin Console
              </button>
            )}
            {user?.role === 'employer' && (
              <button
                onClick={() => setCurrentView('recruiter-dashboard')}
                className="hover:text-emerald-600 transition"
              >
                Recruiter Dashboard
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <JobDetailModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onApply={job => {
          setSelectedJob(null);
          handleStartApply(job);
        }}
        isApplied={selectedJob ? appliedJobIds.includes(selectedJob.id) : false}
      />

      <ApplyModal
        job={jobToApply}
        isOpen={!!jobToApply}
        onClose={() => setJobToApply(null)}
        onSuccess={handleApplicationSuccess}
      />

      <PostJobModal
        isOpen={postJobOpen}
        jobToEdit={jobToEdit}
        onClose={() => {
          setPostJobOpen(false);
          setJobToEdit(null);
        }}
        onJobPosted={() => {
          showToast('Job listing published successfully!');
        }}
      />

      <CandidateProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      <JobAlertsModal
        isOpen={alertsModalOpen}
        onClose={() => setAlertsModalOpen(false)}
      />

      <MessagesModal
        isOpen={messagesModalOpen}
        onClose={() => setMessagesModalOpen(false)}
        targetRecipientId={messageRecipient.id}
        targetRecipientName={messageRecipient.name}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}


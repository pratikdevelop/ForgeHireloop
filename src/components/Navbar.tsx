import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  Building2,
  PlusCircle,
  Bell,
  MessageSquare,
  LogOut,
  User as UserIcon,
  Menu,
  X,
} from 'lucide-react';
import { getDefaultViewForRole } from '../config/navigation';

export const NAV_CONFIG = {
  candidate: [
    { label: 'Find Jobs', view: 'jobs' },
    { label: 'Companies', view: 'companies' },
    { label: 'Recommended', view: 'recommended' },
    { label: 'My Applications', view: 'my-applications' },
    { label: 'Saved', view: 'saved' }
  ],
  employer: [
    { label: 'Dashboard', view: 'recruiter-dashboard' },
    { label: 'Post Job', view: 'post-job' },
    { label: 'Manage Jobs', view: 'manage-jobs' },
    { label: 'Applicants', view: 'view-applicants' }
  ],
  admin: [
    { label: 'Approve Employers', view: 'approve-employers' },
    { label: 'Categories', view: 'manage-categories' },
    { label: 'Analytics', view: 'analytics' },
    { label: 'Moderation', view: 'moderation' }
  ]
};

const GUEST_NAV = [
  { label: 'Find Jobs', view: 'jobs' },
  { label: 'Companies', view: 'companies' }
];

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onOpenPostJob: () => void;
  onOpenAlerts: () => void;
  onOpenMessages: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenProfile,
  onOpenPostJob,
  onOpenAlerts,
  onOpenMessages,
}) => {
  const { user, company, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const currentUser = user;
  // Strictly read only from NAV_CONFIG[currentUser.role] - never renders links for any other role
  const navItems = (currentUser?.role && NAV_CONFIG[currentUser.role as keyof typeof NAV_CONFIG])
    ? NAV_CONFIG[currentUser.role as keyof typeof NAV_CONFIG]
    : GUEST_NAV;

  // Determine root destination based on role
  const handleBrandClick = () => {
    onNavigate(getDefaultViewForRole(currentUser?.role));
  };

  const handleNavClick = (view: string) => {
    if (view === 'post-job') {
      onOpenPostJob();
    } else {
      onNavigate(view);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-8">
            <button
              id="brand-logo-btn"
              onClick={handleBrandClick}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                  ForgeHireloop
                </span>
                <span className="text-[10px] font-medium text-slate-500 tracking-wider uppercase block">
                  {currentUser?.role === 'employer' ? 'Recruiter Portal' : currentUser?.role === 'admin' ? 'Admin Portal' : 'Job Platform'}
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links: STRICT ROLE-BASED FROM NAV_CONFIG[currentUser.role] */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = currentView === item.view;

                const activeThemeClass =
                  currentUser?.role === 'employer'
                    ? 'text-emerald-700 bg-emerald-50 font-semibold'
                    : currentUser?.role === 'admin'
                    ? 'text-purple-700 bg-purple-50 font-semibold'
                    : 'text-blue-600 bg-blue-50/70 font-semibold';

                return (
                  <button
                    key={item.view}
                    id={`nav-${item.view}-btn`}
                    onClick={() => handleNavClick(item.view)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? activeThemeClass
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action Items */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick action for employers: Post a job */}
            {currentUser?.role === 'employer' && (
              <button
                id="post-job-nav-btn"
                onClick={onOpenPostJob}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Post a Job
              </button>
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Job Alerts (Candidate) */}
                {currentUser?.role === 'candidate' && (
                  <button
                    id="open-alerts-btn"
                    onClick={onOpenAlerts}
                    title="Job Alerts"
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition"
                  >
                    <Bell className="w-5 h-5" />
                  </button>
                )}

                {/* Messages */}
                <button
                  id="open-messages-btn"
                  onClick={onOpenMessages}
                  title="Messages"
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600"></span>
                </button>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    id="user-profile-menu-btn"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 pl-2.5 rounded-full border border-slate-200 hover:border-slate-300 transition bg-white"
                  >
                    <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate">
                      {currentUser?.name}
                    </span>
                    <img
                      src={currentUser?.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.name}`}
                      alt={currentUser?.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-100"
                    />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900">{currentUser?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 uppercase tracking-wide">
                          {currentUser?.role} {company ? `• ${company.name}` : ''}
                        </span>
                      </div>

                      {currentUser?.role === 'candidate' && (
                        <button
                          id="dropdown-profile-btn"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenProfile();
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          Candidate Profile & Resume
                        </button>
                      )}

                      {currentUser?.role === 'employer' && (
                        <button
                          id="dropdown-employer-company-btn"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('companies');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Building2 className="w-4 h-4 text-slate-400" />
                          Company Profile
                        </button>
                      )}

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        id="dropdown-signout-btn"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="sign-in-btn"
                  onClick={() => onOpenAuth('login')}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  Sign In
                </button>
                <button
                  id="sign-up-btn"
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            {currentUser?.role === 'employer' && (
              <button
                id="post-job-mobile-btn"
                onClick={onOpenPostJob}
                className="p-2 rounded-lg bg-emerald-600 text-white"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            )}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer: STRICT ROLE-BASED FROM NAV_CONFIG[currentUser.role] */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentView === item.view;

              const activeMobileClass =
                currentUser?.role === 'employer'
                  ? 'text-emerald-800 bg-emerald-50 font-semibold'
                  : currentUser?.role === 'admin'
                  ? 'text-purple-800 bg-purple-50 font-semibold'
                  : 'text-blue-700 bg-blue-50 font-semibold';

              return (
                <button
                  key={item.view}
                  id={`mobile-${item.view}-link`}
                  onClick={() => {
                    handleNavClick(item.view);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                    isActive ? activeMobileClass : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                {currentUser?.role === 'candidate' && (
                  <button
                    id="mobile-prof-btn"
                    onClick={() => {
                      onOpenProfile();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 text-sm text-center border border-slate-300 rounded-lg text-slate-700 font-medium"
                  >
                    Edit Profile & Resume
                  </button>
                )}
                <button
                  id="mobile-signout-btn"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 text-sm text-center bg-rose-50 text-rose-600 rounded-lg font-medium"
                >
                  Sign Out ({currentUser?.name})
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="mobile-signin-btn"
                  onClick={() => {
                    onOpenAuth('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-sm font-medium border border-slate-300 rounded-lg text-slate-700"
                >
                  Sign In
                </button>
                <button
                  id="mobile-reg-btn"
                  onClick={() => {
                    onOpenAuth('register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-sm font-medium bg-blue-600 text-white rounded-lg"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  X,
  Briefcase,
  User,
  Mail,
  Lock,
  Building,
  Globe,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const { login, register, googleLogin } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<UserRole>('candidate');

  // Form input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('Software & Technology');
  const [recruiterTitle, setRecruiterTitle] = useState('Talent Acquisition Lead');

  // Validation & Touched state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus trap ref
  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with props when changed
  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setTouched({});
  }, [initialMode, isOpen]);

  // Focus first input and handle Escape key for accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      // Trap focus inside modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Autofocus email input slightly after modal animation
    const timer = setTimeout(() => {
      emailInputRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, mode, onClose]);

  if (!isOpen) return null;

  // Real-time inline field validation checks
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email.length === 0 || emailRegex.test(email);
  const emailErrorMsg =
    touched.email && email.trim().length > 0 && !emailRegex.test(email)
      ? 'Please enter a valid work or personal email address.'
      : null;

  const isPasswordValid = password.length === 0 || password.length >= 6;
  const passwordErrorMsg =
    touched.password && password.length > 0 && password.length < 6
      ? 'Password must be at least 6 characters long.'
      : null;

  const nameErrorMsg =
    mode === 'register' && touched.name && name.trim().length === 0
      ? 'Full name is required.'
      : null;

  const companyErrorMsg =
    mode === 'register' && role === 'employer' && touched.companyName && companyName.trim().length === 0
      ? 'Company name is required.'
      : null;

  const isFormValid =
    email.trim().length > 0 &&
    emailRegex.test(email) &&
    password.length >= 6 &&
    (mode === 'login' ||
      (name.trim().length > 0 &&
        (role !== 'employer' || companyName.trim().length > 0)));

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      email: true,
      password: true,
      name: true,
      companyName: true,
    });

    if (!isFormValid || loading) return;

    setError(null);
    setLoading(true);

    try {
      let authedUser: any;
      if (mode === 'login') {
        authedUser = await login(email, password);
      } else {
        authedUser = await register({
          email,
          password,
          name,
          role,
          companyName: role === 'employer' ? companyName : undefined,
          companyWebsite: role === 'employer' ? companyWebsite : undefined,
          companyIndustry: role === 'employer' ? companyIndustry : undefined,
          recruiterTitle: role === 'employer' ? recruiterTitle : undefined,
        });
      }
      onSuccess?.(authedUser?.role || role);
      onClose();
    } catch (err: any) {
      // User-friendly formatted error handling
      const rawMsg = err.message || '';
      if (rawMsg.includes('auth/invalid-credential') || rawMsg.includes('invalid-credential') || rawMsg.includes('wrong-password') || rawMsg.includes('user-not-found')) {
        setError('Incorrect email or password. Please verify your credentials and try again.');
      } else if (rawMsg.includes('email-already-in-use')) {
        setError('An account with this email already exists. Please switch to Sign In.');
      } else if (rawMsg.includes('network-request-failed')) {
        setError('Network connectivity interrupted. Please check your internet connection.');
      } else {
        setError(rawMsg.replace(/^Error:\s*/, '') || 'Authentication request could not be completed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const authedUser = await googleLogin(role);
      onSuccess?.(authedUser?.role || role);
      onClose();
    } catch (err: any) {
      if (err.message?.includes('popup-closed-by-user')) {
        setError('Google sign-in was cancelled before completion.');
      } else {
        setError(err.message || 'Google authentication could not be completed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-[var(--shadow-modal)] border border-slate-200/80 overflow-hidden transform transition-all duration-200"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-indigo-700">
                ForgeHireloop Auth
              </span>
            </div>
            <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight text-slate-900">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'login'
                ? 'Pick up where you left off — track interviews & applications.'
                : 'Start applying or hiring exceptional engineering talent in minutes.'}
            </p>
          </div>
          <button
            id="close-auth-modal-btn"
            type="button"
            aria-label="Close authentication modal"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Micro-interaction Tab Switcher */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative p-1 bg-slate-100 rounded-xl flex items-center gap-1 border border-slate-200/60">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg text-center transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg text-center transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Modal Form Content */}
        <div className="p-6 pt-2 space-y-4">
          {/* Friendly Error Banner */}
          {error && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200/80 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Official Multi-Color Google OAuth Button */}
          <button
            id="google-auth-btn"
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-3 px-4 bg-white hover:bg-slate-50/90 active:scale-[0.99] border border-slate-300/80 rounded-xl text-xs font-semibold text-slate-700 shadow-xs transition-all duration-150 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Clean Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              or continue with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            {mode === 'register' && (
              <div className="space-y-3.5 animate-fadeIn">
                {/* Role Switcher: Job Seeker vs Employer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Account Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      id="select-role-candidate"
                      onClick={() => setRole('candidate')}
                      className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all duration-150 ${
                        role === 'candidate'
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 shadow-xs ring-1 ring-indigo-600/30'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            role === 'candidate'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block leading-tight">Job Seeker</span>
                          <span className="text-[10px] text-slate-500 font-normal">Browse & apply</span>
                        </div>
                      </div>
                      {role === 'candidate' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      id="select-role-employer"
                      onClick={() => setRole('employer')}
                      className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all duration-150 ${
                        role === 'employer'
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 shadow-xs ring-1 ring-emerald-600/30'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            role === 'employer'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block leading-tight">Employer</span>
                          <span className="text-[10px] text-slate-500 font-normal">Post & hire</span>
                        </div>
                      </div>
                      {role === 'employer' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Full Name Input */}
                <div>
                  <label htmlFor="register-name-input" className="block text-xs font-semibold text-slate-800 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="register-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => handleBlur('name')}
                      placeholder="e.g. Sarah Jenkins"
                      className={`w-full h-10 pl-9 pr-3 text-xs bg-white border rounded-xl outline-hidden transition-all duration-150 ${
                        nameErrorMsg
                          ? 'border-rose-400 ring-2 ring-rose-100'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                      }`}
                    />
                  </div>
                  {nameErrorMsg && <p className="text-[11px] text-rose-600 mt-1">{nameErrorMsg}</p>}
                </div>

                {/* Employer Organization Fields */}
                {role === 'employer' && (
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3 animate-fadeIn">
                    <div>
                      <label htmlFor="register-company-name-input" className="block text-xs font-semibold text-slate-800 mb-1">
                        Company Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          id="register-company-name-input"
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          onBlur={() => handleBlur('companyName')}
                          placeholder="e.g. TechFlow Systems"
                          className={`w-full h-10 pl-9 pr-3 text-xs bg-white border rounded-xl outline-hidden transition-all duration-150 ${
                            companyErrorMsg
                              ? 'border-rose-400 ring-2 ring-rose-100'
                              : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                          }`}
                        />
                      </div>
                      {companyErrorMsg && (
                        <p className="text-[11px] text-rose-600 mt-1">{companyErrorMsg}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="register-company-website-input" className="block text-xs font-semibold text-slate-800 mb-1">
                          Website
                        </label>
                        <div className="relative">
                          <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            id="register-company-website-input"
                            type="url"
                            value={companyWebsite}
                            onChange={(e) => setCompanyWebsite(e.target.value)}
                            placeholder="https://..."
                            className="w-full h-10 pl-9 pr-2.5 text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all duration-150"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="register-recruiter-title-input" className="block text-xs font-semibold text-slate-800 mb-1">
                          Your Role Title
                        </label>
                        <input
                          id="register-recruiter-title-input"
                          type="text"
                          value={recruiterTitle}
                          onChange={(e) => setRecruiterTitle(e.target.value)}
                          placeholder="e.g. Head of Talent"
                          className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all duration-150"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="auth-email-input" className="block text-xs font-semibold text-slate-800 mb-1">
                Work or Personal Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  ref={emailInputRef}
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="name@example.com"
                  className={`w-full h-10 pl-9 pr-3 text-xs bg-white border rounded-xl outline-hidden transition-all duration-150 ${
                    emailErrorMsg
                      ? 'border-rose-400 ring-2 ring-rose-100'
                      : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
              </div>
              {emailErrorMsg && <p className="text-[11px] text-rose-600 mt-1">{emailErrorMsg}</p>}
            </div>

            {/* Password Input with Show/Hide Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password-input" className="block text-xs font-semibold text-slate-800">
                  Password <span className="text-rose-500">*</span>
                </label>
                {mode === 'login' && (
                  <span className="text-[11px] text-slate-400 hover:text-indigo-600 cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  placeholder="At least 6 characters"
                  className={`w-full h-10 pl-9 pr-10 text-xs bg-white border rounded-xl outline-hidden transition-all duration-150 ${
                    passwordErrorMsg
                      ? 'border-rose-400 ring-2 ring-rose-100'
                      : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrorMsg && (
                <p className="text-[11px] text-rose-600 mt-1">{passwordErrorMsg}</p>
              )}
            </div>

            {/* Submit Action Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading || !isFormValid}
              className={`w-full h-11 px-4 rounded-xl text-xs font-bold text-white transition-all duration-150 shadow-xs flex items-center justify-center gap-2 ${
                mode === 'register' && role === 'employer'
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] focus-visible:outline-emerald-600'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] focus-visible:outline-indigo-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : mode === 'login' ? (
                <span>Sign In to ForgeHireloop</span>
              ) : (
                <span>Create {role === 'employer' ? 'Employer' : 'Candidate'} Account</span>
              )}
            </button>
          </form>

          {/* Privacy & Terms footer notice */}
          <p className="text-[11px] text-center text-slate-400 leading-normal pt-1">
            By proceeding, you agree to ForgeHireloop’s{' '}
            <span className="text-slate-600 underline cursor-pointer">Terms of Service</span> and{' '}
            <span className="text-slate-600 underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

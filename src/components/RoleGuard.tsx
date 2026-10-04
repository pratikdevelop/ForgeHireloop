import React, { useEffect, useTransition } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { getDefaultViewForRole } from '../config/navigation';
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react';

export interface RoleGuardProps {
  /**
   * List of user roles allowed to access this route / view
   */
  allowedRoles: UserRole[];
  /**
   * Whether unauthenticated visitors (guests) are permitted
   */
  allowGuest?: boolean;
  /**
   * Optional custom fallback view when authorization fails
   */
  fallbackView?: string;
  /**
   * Callback to transition the active view without error dumps or flashes
   */
  onRedirect: (targetView: string) => void;
  /**
   * Child view component to render when authorized
   */
  children: React.ReactNode;
}

/**
 * RoleGuard / ProtectedRoute
 * Enforces strict, code-level access control on application views.
 * If unauthorized, blocks component rendering and smoothly redirects to authorized default view.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  allowGuest = false,
  fallbackView,
  onRedirect,
  children,
}) => {
  const { user, isLoading } = useAuth();
  const [, startTransition] = useTransition();

  const isAuthorized = user
    ? allowedRoles.includes(user.role)
    : Boolean(allowGuest);

  const targetDestination = fallbackView || getDefaultViewForRole(user?.role);

  useEffect(() => {
    // If still restoring session credentials, wait before evaluating
    if (isLoading) return;

    if (!isAuthorized) {
      // Determine the user's own default landing view
      startTransition(() => {
        onRedirect(targetDestination);
      });
    }
  }, [isAuthorized, isLoading, user?.role, targetDestination, onRedirect]);

  // While restoring session credentials, show nothing or clean loader
  if (isLoading) {
    return null;
  }

  // If unauthorized, do not render protected children under any circumstances
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4 animate-in fade-in duration-200">
        <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Restricted Access</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            This workspace requires{' '}
            <span className="font-semibold text-slate-700 capitalize">
              {allowedRoles.join(' or ')}
            </span>{' '}
            privileges. {user ? `You are signed in as a ${user.role}.` : 'Please sign in to proceed.'}
          </p>
        </div>

        <div className="pt-2">
          <button
            id="role-guard-redirect-btn"
            type="button"
            onClick={() => onRedirect(targetDestination)}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <span>Return to Authorized Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Reusable alias
export const ProtectedRoute = RoleGuard;


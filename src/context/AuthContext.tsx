import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, testFirestoreConnection } from '../firebase';
import { firestoreService } from '../api/firestoreService';
import { User, Company, UserRole } from '../types';
import { getDefaultViewForRole } from '../config/navigation';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  defaultRoute: string;
  login: (email: string, pass: string) => Promise<User>;
  register: (payload: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    companyName?: string;
    companyWebsite?: string;
    companyIndustry?: string;
    recruiterTitle?: string;
  }) => Promise<User>;
  googleLogin: (role?: UserRole) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updateCompanyProfile: (updates: Partial<Company>) => Promise<void>;
  uploadResume: (resumeUrl: string, fileName: string) => Promise<void>;
  toggleSaveJob: (jobId: string) => Promise<void>;
  toggleFollowCompany: (companyId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert technical Firebase error strings into friendly user messages
function formatAuthError(err: any): string {
  if (!err) return 'Authentication failed. Please try again.';
  const message: string = err.message || String(err);
  const code: string = err.code || '';

  if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed')) {
    return 'Email registration provider is currently initializing. Please try again or sign in with Google.';
  }
  if (code === 'auth/email-already-in-use' || message.includes('email-already-in-use')) {
    return 'An account with this email address already exists. Please log in instead.';
  }
  if (code === 'auth/invalid-email' || message.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/weak-password' || message.includes('weak-password')) {
    return 'Password should be at least 6 characters long.';
  }
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in was cancelled before completion.';
  }
  return message.replace(/^Firebase:\s*(Error\s*)?(\([a-z0-9/-]+\)\.?\s*)?/i, '').trim() || 'Authentication failed.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Test connection and listen to Firebase Auth state
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        // Check for cached local session if Firebase auth state is empty
        const cachedUserStr = localStorage.getItem('forgehireloop_user');
        const cachedCompStr = localStorage.getItem('forgehireloop_company');
        const cachedToken = localStorage.getItem('forgehireloop_token');
        if (cachedUserStr && cachedToken) {
          try {
            const parsedUser = JSON.parse(cachedUserStr);
            setUser(parsedUser);
            if (cachedCompStr) setCompany(JSON.parse(cachedCompStr));
            setToken(cachedToken);
            setIsLoading(false);
            return;
          } catch {}
        }
        setUser(null);
        setCompany(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      try {
        const idToken = await fbUser.getIdToken();
        setToken(idToken);
        localStorage.setItem('forgehireloop_token', idToken);

        // Fetch real user document from Firestore
        let userDoc: User | null = null;
        try {
          userDoc = await firestoreService.getUser(fbUser.uid);
        } catch {}

        if (!userDoc) {
          // If first time with Google, initialize user doc
          const isDeepashAdmin = fbUser.email?.toLowerCase() === 'deepashsharma19@gmail.com';
          const defaultUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            role: isDeepashAdmin ? 'admin' : 'candidate',
            status: 'active',
            savedJobIds: [],
            followedCompanyIds: [],
            skills: ['React', 'TypeScript', 'Node.js'],
            experience: [],
            education: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...(fbUser.photoURL ? { photoUrl: fbUser.photoURL } : {}),
          };
          try {
            userDoc = await firestoreService.setUser(fbUser.uid, defaultUser);
          } catch {
            userDoc = defaultUser;
          }
        }

        setUser(userDoc);
        localStorage.setItem('forgehireloop_user', JSON.stringify(userDoc));

        // If employer, fetch company doc
        if (userDoc.companyId) {
          try {
            const comp = await firestoreService.getCompany(userDoc.companyId);
            setCompany(comp);
            if (comp) localStorage.setItem('forgehireloop_company', JSON.stringify(comp));
          } catch {}
        } else {
          setCompany(null);
        }
      } catch (err) {
        console.error('Error synchronizing Firebase user:', err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    try {
      let fbUser: FirebaseUser | null = null;
      let idToken: string = '';

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        fbUser = userCredential.user;
        idToken = await fbUser.getIdToken();
        setToken(idToken);
      } catch (fbErr: any) {
        console.warn('Firebase login exception, evaluating fallback:', fbErr.code, fbErr.message);
        if (
          fbErr.code === 'auth/operation-not-allowed' ||
          fbErr.code === 'auth/configuration-not-found' ||
          fbErr.message?.includes('operation-not-allowed')
        ) {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Invalid credentials');
          setToken(data.token);
          setUser(data.user);
          if (data.company) setCompany(data.company);
          localStorage.setItem('forgehireloop_user', JSON.stringify(data.user));
          if (data.company) localStorage.setItem('forgehireloop_company', JSON.stringify(data.company));
          localStorage.setItem('forgehireloop_token', data.token);
          return data.user;
        }
        throw fbErr;
      }

      let userDoc: User | null = null;
      try {
        userDoc = await firestoreService.getUser(fbUser.uid);
      } catch {}

      if (!userDoc) {
        userDoc = {
          id: fbUser.uid,
          name: fbUser.displayName || email.split('@')[0],
          email: fbUser.email || email,
          role: email.includes('admin') ? 'admin' : email.includes('recruiter') || email.includes('employer') ? 'employer' : 'candidate',
          status: 'active',
          savedJobIds: [],
          followedCompanyIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await firestoreService.setUser(fbUser.uid, userDoc);
        } catch {}
      }

      setUser(userDoc);
      localStorage.setItem('forgehireloop_user', JSON.stringify(userDoc));
      localStorage.setItem('forgehireloop_token', idToken);

      if (userDoc.companyId) {
        try {
          const comp = await firestoreService.getCompany(userDoc.companyId);
          if (comp) {
            setCompany(comp);
            localStorage.setItem('forgehireloop_company', JSON.stringify(comp));
          }
        } catch {}
      }
      return userDoc;
    } catch (err: any) {
      console.error('Login failed:', err);
      throw new Error(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    companyName?: string;
    companyWebsite?: string;
    companyIndustry?: string;
    recruiterTitle?: string;
  }): Promise<User> => {
    setIsLoading(true);
    try {
      let fbUser: FirebaseUser | null = null;
      let idToken: string = '';

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
        fbUser = userCredential.user;
        idToken = await fbUser.getIdToken();
        setToken(idToken);
      } catch (fbErr: any) {
        console.warn('Firebase direct register error, evaluating fallback:', fbErr.code, fbErr.message);
        if (
          fbErr.code === 'auth/operation-not-allowed' ||
          fbErr.code === 'auth/configuration-not-found' ||
          fbErr.message?.includes('operation-not-allowed')
        ) {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Registration failed');
          setToken(data.token);
          setUser(data.user);
          if (data.company) setCompany(data.company);
          localStorage.setItem('forgehireloop_user', JSON.stringify(data.user));
          if (data.company) localStorage.setItem('forgehireloop_company', JSON.stringify(data.company));
          localStorage.setItem('forgehireloop_token', data.token);
          return data.user;
        }
        throw fbErr;
      }

      let companyId: string | undefined = undefined;
      let newCompany: Company | null = null;

      // If registering as employer, create company document
      if (payload.role === 'employer' && payload.companyName) {
        companyId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const compData: Company = {
          id: companyId,
          name: payload.companyName,
          logoUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(payload.companyName)}`,
          description: `${payload.companyName} is hiring top talent via ForgeHireloop.`,
          industry: payload.companyIndustry || 'Technology',
          size: '50-200 employees',
          location: 'San Francisco, CA',
          website: payload.companyWebsite || 'https://example.com',
          verified: true,
          employerIds: [fbUser.uid],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          newCompany = await firestoreService.setCompany(compData);
        } catch {
          newCompany = compData;
        }
        setCompany(newCompany);
        localStorage.setItem('forgehireloop_company', JSON.stringify(newCompany));
      }

      // Create user document
      let newUserDoc: User;
      const userPayload: Partial<User> = {
        id: fbUser.uid,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        status: 'active',
        companyId,
        recruiterTitle: payload.recruiterTitle,
        savedJobIds: [],
        followedCompanyIds: [],
        skills: payload.role === 'candidate' ? ['Problem Solving', 'Communication'] : undefined,
        experience: [],
        education: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        newUserDoc = await firestoreService.setUser(fbUser.uid, userPayload);
      } catch {
        newUserDoc = userPayload as User;
      }

      setUser(newUserDoc);
      localStorage.setItem('forgehireloop_user', JSON.stringify(newUserDoc));
      localStorage.setItem('forgehireloop_token', idToken);
      return newUserDoc;
    } catch (err: any) {
      console.error('Firebase Registration failed:', err);
      throw new Error(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (role: UserRole = 'candidate'): Promise<User> => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();
      setToken(idToken);

      let userDoc = await firestoreService.getUser(fbUser.uid);
      if (!userDoc) {
        const isDeepashAdmin = fbUser.email?.toLowerCase() === 'deepashsharma19@gmail.com';
        const assignedRole: UserRole = isDeepashAdmin ? 'admin' : role;

        let companyId: string | undefined = undefined;
        if (assignedRole === 'employer') {
          companyId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const compName = `${fbUser.displayName || 'Employer'}'s Organization`;
          const createdComp = await firestoreService.setCompany({
            id: companyId,
            name: compName,
            logoUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(compName)}`,
            description: `${compName} on ForgeHireloop.`,
            industry: 'Technology',
            size: '50-100 employees',
            location: 'Remote',
            website: 'https://forgehireloop.com',
            verified: true,
            employerIds: [fbUser.uid],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setCompany(createdComp);
        }

        const newUserData: Partial<User> = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email || '',
          role: assignedRole,
          status: 'active',
          companyId,
          savedJobIds: [],
          followedCompanyIds: [],
          skills: assignedRole === 'candidate' ? ['TypeScript', 'React', 'Problem Solving'] : undefined,
          experience: [],
          education: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(fbUser.photoURL ? { photoUrl: fbUser.photoURL } : {}),
        };

        userDoc = await firestoreService.setUser(fbUser.uid, newUserData);
      }

      setUser(userDoc);
      if (userDoc.companyId) {
        const comp = await firestoreService.getCompany(userDoc.companyId);
        setCompany(comp);
      }
      return userDoc;
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      throw new Error(err.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
      setCompany(null);
      setToken(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!user) return;
    await firestoreService.updateUser(user.id, updates);
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const updateCompanyProfile = async (updates: Partial<Company>): Promise<void> => {
    const targetCompanyId = company?.id || user?.companyId;
    if (!targetCompanyId) return;
    const existing = await firestoreService.getCompany(targetCompanyId);
    const updated = await firestoreService.setCompany({
      ...(existing || {}),
      ...updates,
      id: targetCompanyId,
    } as Company);
    setCompany(updated);
  };

  const uploadResume = async (resumeUrl: string, fileName: string): Promise<void> => {
    if (!user) return;
    const now = new Date().toISOString();
    const updates = {
      resumeUrl,
      resumeFileName: fileName,
      resumeUploadedAt: now,
    };
    await firestoreService.updateUser(user.id, updates);
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const toggleSaveJob = async (jobId: string): Promise<void> => {
    if (!user) return;
    const currentSaved = user.savedJobIds || [];
    const isSaved = currentSaved.includes(jobId);
    const newSaved = isSaved ? currentSaved.filter((id) => id !== jobId) : [...currentSaved, jobId];

    await firestoreService.updateUser(user.id, { savedJobIds: newSaved });
    setUser((prev) => (prev ? { ...prev, savedJobIds: newSaved } : null));
  };

  const toggleFollowCompany = async (companyId: string): Promise<void> => {
    if (!user) return;
    const currentFollowed = user.followedCompanyIds || [];
    const isFollowed = currentFollowed.includes(companyId);
    const newFollowed = isFollowed
      ? currentFollowed.filter((id) => id !== companyId)
      : [...currentFollowed, companyId];

    await firestoreService.updateUser(user.id, { followedCompanyIds: newFollowed });
    setUser((prev) => (prev ? { ...prev, followedCompanyIds: newFollowed } : null));
  };

  const defaultRoute = getDefaultViewForRole(user?.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        token,
        isAuthenticated: !!user,
        isLoading,
        defaultRoute,
        login,
        register,
        googleLogin,
        logout,
        updateProfile,
        updateCompanyProfile,
        uploadResume,
        toggleSaveJob,
        toggleFollowCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

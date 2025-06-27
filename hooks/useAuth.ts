import { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { FIREBASE_CONFIG } from '../constants';
import { AppUser } from '../types';

// Initialize Firebase outside the hook to avoid re-initialization
if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

const auth = firebase.auth();

interface UseAuthReturn {
  user: AppUser | null;
  loadingAuth: boolean; // Indicates if the initial auth state is being loaded
  // signIn: () => Promise<void>; // Add specific sign-in methods later if needed
  signOut: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(firebaseUser => {
      if (firebaseUser) {
        // User is signed in.
        setUser(firebaseUser as AppUser);
      } else {
        // User is signed out.
        setUser(null);
      }
      setLoadingAuth(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return {
    user,
    loadingAuth,
    signOut,
  };
};

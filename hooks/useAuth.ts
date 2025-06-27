import { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { FIREBASE_CONFIG } from '../constants';
import { AppUser } from '../types';

if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}
const auth = firebase.auth();

interface UseAuthReturn {
  user: AppUser | null;
  loadingAuth: boolean;
  signOut: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(firebaseUser => {
      setUser(firebaseUser ? (firebaseUser as AppUser) : null);
      setLoadingAuth(false);
    });
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

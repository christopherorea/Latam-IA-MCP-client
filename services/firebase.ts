import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { FIREBASE_CONFIG } from '../constants';

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

export const auth = firebase.auth();
// firebaseui is loaded globally from index.html and accessed via window.firebaseui in Auth.tsx
// No need to export firebaseUi from here.

export default firebase;

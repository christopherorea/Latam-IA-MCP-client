import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { FIREBASE_CONFIG } from '../constants';


if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

export const auth = firebase.auth();



export default firebase;

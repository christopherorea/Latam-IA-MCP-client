import React, { useEffect, useRef } from 'react';
import { auth } from '../services/firebase';
import firebase from 'firebase/compat/app'; // For EmailAuthProvider, GoogleAuthProvider

// FirebaseUI config
const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
    firebase.auth.EmailAuthProvider.PROVIDER_ID,
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    // Add other providers here, like:
    // firebase.auth.GithubAuthProvider.PROVIDER_ID,
  ],
  callbacks: {
    // Avoid redirects after sign-in.
    signInSuccessWithAuthResult: () => false,
  },
};

const Auth: React.FC = () => {
  const uiContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Ensure firebaseui is available (it's loaded globally from index.html)
    if (window.firebaseui) {
      const ui = window.firebaseui.auth.AuthUI.getInstance() || new window.firebaseui.auth.AuthUI(auth);
      if (uiContainerRef.current) {
        ui.start(uiContainerRef.current, uiConfig);
      }
    } else {
      console.error("FirebaseUI not loaded. Ensure it's included in index.html.");
    }

    // Optional: FirebaseUI's own cleanup logic usually handles this.
    // If you specifically need to delete the instance on component unmount:
    // return () => {
    //   const uiInstance = window.firebaseui?.auth?.AuthUI.getInstance();
    //   if (uiInstance) {
    //     uiInstance.delete();
    //   }
    // };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold text-center text-sky-400 mb-8">MCP Client Login</h1>
        <div id="firebaseui-auth-container" ref={uiContainerRef}></div>
        <p className="text-xs text-gray-500 mt-8 text-center">
          Powered by Firebase. Ensure your Firebase project is correctly configured with API key, auth domain, and enabled providers in <code>constants.tsx</code>.
        </p>
      </div>
    </div>
  );
};

export default Auth;

import React, { useEffect, useRef } from 'react';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';
import { auth } from '../../services/firebase';


const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
    auth.EmailAuthProvider.PROVIDER_ID,
    auth.GoogleAuthProvider.PROVIDER_ID,
  ],
  callbacks: {
    
    signInSuccessWithAuthResult: () => false,
  },
};

const Auth: React.FC = () => {
  const uiContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    
    if (firebaseui) {
      const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
      if (uiContainerRef.current) {
        ui.start(uiContainerRef.current, uiConfig);
      }
    } else {
      console.error("FirebaseUI not loaded. Ensure it's included in index.html.");
    }

    
    
    
    
    
    
    
    
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

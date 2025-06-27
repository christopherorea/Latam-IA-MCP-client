import React from 'react';
import { AppUser } from '../types';
import { LogoutIcon } from '../constants';

interface HeaderProps {
  user: AppUser | null;
  signOut: () => Promise<void>;
}

const Header: React.FC<HeaderProps> = ({ user, signOut }) => {
  return (
    <header className="bg-gray-800 shadow-lg p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-sky-400">
          MCP LLM Client
        </h1>
        {user && (
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm hidden sm:block">
              {user.email || user.displayName || 'Authenticated User'}
            </span>
            <button
              onClick={signOut}
              className="flex items-center bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
              aria-label="Logout"
            >
              <LogoutIcon className="mr-2" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-gray-800 text-gray-400 text-center p-6 mt-auto shadow-inner">
      <p>&copy; {currentYear} MCP LLM Client. All rights reserved.</p>
      <p className="text-xs mt-1">
        This is a demonstration application. Handle API keys with care.
      </p>
    </footer>
  );
};

export default Footer;

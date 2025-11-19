
import React from 'react';
import { StethoscopeIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 md:px-6 shadow-sm flex-shrink-0">
      <div className="flex items-center space-x-3">
        <StethoscopeIcon className="h-8 w-8 text-blue-600 dark:text-blue-500" />
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          AI Physician's Assistant
        </h1>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Clinical Support Agent
      </div>
    </header>
  );
};

export default Header;

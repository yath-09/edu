// src/components/Layout/Layout.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Target, ClipboardList } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const sidebarItems = [
    { 
      icon: BookOpen, 
      label: 'Explore', 
      path: '/'
    },
    { 
      icon: Target, 
      label: 'Playground', 
      path: '/playground'
    },
    { 
      icon: ClipboardList, 
      label: 'Test', 
      path: '/test'
    }
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800">
        {/* Logo/Header */}
        <Link to="/" className="p-4 flex items-center space-x-2 hover:bg-gray-800 transition-colors">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
              <path
                fill="currentColor"
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              />
            </svg>
          </div>
          <span className="text-xl font-semibold">educasm</span>
        </Link>

        {/* Navigation */}
        <nav className="mt-6">
          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-sm
                ${isActive(item.path)
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-400 hover:bg-gray-800'}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
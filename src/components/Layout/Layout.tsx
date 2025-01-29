// src/components/Layout/Layout.tsx
import React, { useState, useEffect } from 'react';
import { BookOpen, Target, ClipboardList } from 'lucide-react';
import { PreFillForm } from '../shared/PreFillForm';

interface UserContext {
  age: number;
  location: string;
  studyingFor?: string;
}

interface LayoutProps {
  children: React.ReactNode;
  currentMode: 'playground' | 'explore' | 'test';
  onModeChange: (mode: 'playground' | 'explore' | 'test') => void;
  onRelatedQueryClick?: (query: string) => void;
}

export const Layout = ({ 
  children, 
  currentMode, 
  onModeChange,
  onRelatedQueryClick 
}: LayoutProps) => {
  const [userContext, setUserContext] = useState<UserContext | null>(null);

  const handleModeChange = (mode: 'playground' | 'explore' | 'test') => {
    onModeChange(mode);
  };

  const sidebarItems = [
    { icon: Target, label: 'Playground', mode: 'playground' as const },
    { icon: BookOpen, label: 'Explore', mode: 'explore' as const },
    { icon: ClipboardList, label: 'Test', mode: 'test' as const }
  ];

  // Add this to handle form submission
  const handlePreFillSubmit = (data: UserContext) => {
    setUserContext(data);
    // Save to localStorage for persistence
    localStorage.setItem('userContext', JSON.stringify(data));
  };

  // Load user context from localStorage on mount
  useEffect(() => {
    const savedContext = localStorage.getItem('userContext');
    if (savedContext) {
      setUserContext(JSON.parse(savedContext));
    }
  }, []);

  // Add user context to children props
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        onRelatedQueryClick,
        onError: (msg: string) => console.error(msg),
        onSuccess: (msg: string) => console.log(msg),
        userContext // Pass the user context
      });
    }
    return child;
  });

  return (
    <div className="flex h-screen bg-background">
      {!userContext && <PreFillForm onSubmit={handlePreFillSubmit} />}
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800">
        {/* Logo/Header - clickable to go to playground */}
        <div 
          onClick={() => handleModeChange('playground')}
          className="p-4 flex items-center space-x-2 cursor-pointer hover:bg-gray-800 transition-colors"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
              <path
                fill="currentColor"
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              />
            </svg>
          </div>
          <span className="text-xl font-semibold">educasm</span>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleModeChange(item.mode)}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-sm
                ${currentMode === item.mode 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-400 hover:bg-gray-800'}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          {userContext && childrenWithProps}
        </main>
      </div>
    </div>
  );
};
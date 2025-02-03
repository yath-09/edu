// src/components/Layout/Layout.tsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Book, Target, Menu, X } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      path: "/",
      name: "Explore",
      icon: Book,
    },
    {
      path: "/playground",
      name: "Playground",
      icon: Target,
    },
    // {
    //   path: '/test',
    //   name: 'Test',
    //   icon: ClipboardList,
    // },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 border-r border-gray-800">
        {/* Logo/Header */}
        <Link
          to="/"
          className="p-4 flex items-center space-x-2 hover:bg-gray-800 transition-colors"
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
        </Link>

        {/* Desktop Navigation */}
        <nav className="mt-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-sm
                ${
                  isActive(item.path)
                    ? "bg-primary/10 text-primary"
                    : "text-gray-400 hover:bg-gray-800"
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile Top Bar */}
      <div
        className="fixed md:hidden top-0 left-0 right-0 h-16 bg-gray-900/95 
        backdrop-blur-lg border-b border-gray-800 z-50 flex items-center justify-between px-4"
      >
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-gray-400 hover:text-gray-200"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white">
              <path
                fill="currentColor"
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold">educasm</span>
        </div>
        <div className="w-6" /> {/* Spacer for centering */}
      </div>

      {/* Mobile Slide-in Menu */}
      <div
        className={`fixed md:hidden inset-0 bg-black/50 z-50 transition-opacity duration-300
        ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div
          className={`absolute top-0 left-0 bottom-0 w-64 bg-gray-900 transform transition-transform 
            duration-300 ease-in-out ${
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
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

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="mt-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 text-sm
                  ${
                    isActive(item.path)
                      ? "bg-primary/10 text-primary"
                      : "text-gray-400 hover:bg-gray-800"
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6 pt-20 md:pt-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
};

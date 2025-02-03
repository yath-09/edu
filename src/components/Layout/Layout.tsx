// src/components/Layout/Layout.tsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Gamepad2 } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Force a navigation to "/" even if we're already there
    navigate('/', { replace: true });
    // Dispatch a custom event that ExploreView can listen for
    window.dispatchEvent(new CustomEvent('resetExplore'));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Logo Bar - Simplified */}
      <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-lg z-40">
        <div className="flex justify-center items-center h-14 px-4">
          <a href="/" onClick={handleLogoClick} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
                <path
                  fill="currentColor"
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">
              educasm
            </span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mt-14 mb-[5.5rem]">
        <div className="max-w-4xl mx-auto px-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg 
        border-t border-gray-800 z-40">
        <div className="flex justify-around items-center h-12 max-w-4xl mx-auto">
          <Link 
            to="/" 
            className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-lg
              transition-colors ${location.pathname === '/' 
                ? 'text-primary' 
                : 'text-gray-400 hover:text-gray-300'}`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px]">Explore</span>
          </Link>

          <Link 
            to="/playground" 
            className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-lg
              transition-colors ${location.pathname === '/playground' 
                ? 'text-primary' 
                : 'text-gray-400 hover:text-gray-300'}`}
          >
            <Gamepad2 className="w-5 h-5" />
            <span className="text-[10px]">Playground</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

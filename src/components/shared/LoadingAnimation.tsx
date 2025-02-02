export const LoadingAnimation = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative w-16 h-16 mb-6">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full">
          <div className="absolute inset-0 border-t-4 border-r-4 border-primary rounded-full 
            animate-spin duration-1000"></div>
        </div>
        
        {/* Inner pulsing ring */}
        <div className="absolute inset-2 border-2 border-primary/30 rounded-full 
          animate-pulse duration-1000"></div>
        
        {/* Logo in center */}
        <div className="absolute inset-0 flex items-center justify-center text-primary">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
        </div>
      </div>
      <div className="space-y-2 text-center">
        <p className="text-sm text-gray-400">
          Just a moment...
        </p>
      </div>
    </div>
  );
}; 
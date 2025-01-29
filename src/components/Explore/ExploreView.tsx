// src/components/Explore/ExploreView.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { SearchBar } from '../../components/shared/SearchBar';
import { GPTService } from '../../services/gptService';
import { UserContext, MarkdownComponentProps } from '../../types';

interface Message {
  type: 'user' | 'ai';
  content?: string;
  parts?: string[];
  relatedQueries?: Array<{
    query: string;
    type: string;
    context: string;
  }>;
  currentPartIndex?: number;
}

interface ExploreViewProps {
  initialQuery?: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onRelatedQueryClick?: (query: string) => void;
  userContext: UserContext;
}

interface NavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  currentIndex: number;
  totalParts: number;
}

const ProfessorAvatar = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    <path d="M9 10h6v2H9zm3-7L8 7l4 4 4-4z"/>
  </svg>
);

const UserAvatar = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
  </svg>
);

const MarkdownComponents: Record<string, React.FC<MarkdownComponentProps>> = {
  h1: ({ children, ...props }) => (
    <h1 className="text-2xl font-bold text-gray-100 mt-6 mb-4" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-xl font-semibold text-gray-100 mt-5 mb-3" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="text-gray-300 my-2 text-base leading-relaxed" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside my-2 text-gray-300" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside my-2 text-gray-300" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="my-1 text-gray-300" {...props}>
      {children}
    </li>
  ),
  code: ({ children, inline, ...props }) => (
    inline ? 
      <code className="bg-gray-700 px-1 rounded text-sm" {...props}>{children}</code> :
      <code className="block bg-gray-700 p-2 rounded my-2 text-sm overflow-x-auto" {...props}>
        {children}
      </code>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-4 border-gray-500 pl-4 my-2 text-gray-400 italic" {...props}>
      {children}
    </blockquote>
  ),
};

const Navigation: React.FC<NavigationProps> = ({ onPrevious, onNext, currentIndex, totalParts }) => (
  <div className="flex justify-between items-center mt-4">
    <button
      onClick={onPrevious}
      disabled={currentIndex === 0}
      className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg 
        disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Previous
    </button>
    <span className="text-sm text-gray-400">
      Part {currentIndex + 1} of {totalParts}
    </span>
    <button
      onClick={onNext}
      disabled={currentIndex === totalParts - 1}
      className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg 
        disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Next
    </button>
  </div>
);

export const ExploreView: React.FC<ExploreViewProps> = ({ 
  initialQuery, 
  onError, 
  onSuccess,
  onRelatedQueryClick,
  userContext 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInitialSearch, setShowInitialSearch] = useState(true);
  const [searchKey, setSearchKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const gptService = useMemo(() => new GPTService(), []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleSearch = useCallback(async (query: string) => {
    try {
      setMessages(prev => [...prev, { type: 'user', content: query }]);
      setShowInitialSearch(false);
      setSearchKey(prev => prev + 1);

      const response = await gptService.getExploreContent(query, userContext);
      
      setMessages(prev => [...prev, { 
        type: 'ai', 
        parts: response.parts,
        relatedQueries: response.relatedQueries,
        currentPartIndex: 0
      }]);
      
      scrollToTop();
      onSuccess('Content loaded successfully');
    } catch (error) {
      console.error('Full error details:', error);
      onError('Failed to load content');
    }
  }, [gptService, onError, onSuccess, userContext]);

  const handleRelatedQueryClick = useCallback((query: string) => {
    if (onRelatedQueryClick) {
      onRelatedQueryClick(query);
    }
    handleSearch(query);
    scrollToTop();
  }, [onRelatedQueryClick, handleSearch]);

  const handleNextPart = useCallback(() => {
    setMessages(prev => {
      const lastMessageIndex = prev.length - 1;
      const lastMessage = prev[lastMessageIndex];
      
      if (lastMessage?.type === 'ai' && 
          lastMessage.parts && 
          lastMessage.currentPartIndex !== undefined && 
          lastMessage.currentPartIndex < lastMessage.parts.length - 1) {
        
        const newMessages = [...prev];
        newMessages[lastMessageIndex] = {
          ...lastMessage,
          currentPartIndex: lastMessage.currentPartIndex + 1
        };
        return newMessages;
      }
      return prev;
    });
  }, []);

  const handlePreviousPart = useCallback(() => {
    setMessages(prev => {
      const lastMessageIndex = prev.length - 1;
      const lastMessage = prev[lastMessageIndex];
      
      if (lastMessage?.type === 'ai' && 
          lastMessage.currentPartIndex !== undefined && 
          lastMessage.currentPartIndex > 0) {
        
        const newMessages = [...prev];
        newMessages[lastMessageIndex] = {
          ...lastMessage,
          currentPartIndex: lastMessage.currentPartIndex - 1
        };
        return newMessages;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  return (
    <div className="max-w-4xl mx-auto px-4 min-h-screen flex flex-col">
      {showInitialSearch ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-3xl">
            <div className="text-center space-y-4 mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
               
              </h1>
            </div>
            <SearchBar 
              key="initial-search"
              onSearch={handleSearch} 
              placeholder="Enter what you want to explore..."
              centered={true}
              title="What do you want to explore?"
              suggestions={[
                { text: 'Quantum Physics', icon: '⚛️' },
                { text: 'Machine Learning', icon: '🤖' },
                { text: 'World History', icon: '🌍' }
              ]}
              className="bg-gray-900/80"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6 py-6">
          <div className="space-y-4" ref={messagesEndRef}>
            {messages.map((message, index) => (
              <div key={index} className="flex flex-col space-y-3 animate-fadeIn">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white
                    ${message.type === 'user' 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20' 
                      : 'bg-gradient-to-br from-primary to-purple-600 shadow-primary/20'}
                    shadow-lg transform hover:scale-105 transition-all duration-200`}
                  >
                    {message.type === 'user' ? <UserAvatar /> : <ProfessorAvatar />}
                  </div>
                  
                  <div className="flex-1">
                    <div className={`rounded-2xl p-6 ${
                      message.type === 'user' 
                        ? 'bg-gray-800/30 backdrop-blur-sm border border-gray-700/50' 
                        : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm shadow-xl border border-gray-700/50'
                    }`}>
                      {message.type === 'user' ? (
                        <p className="text-gray-200 text-lg font-medium">
                          {message.content}
                        </p>
                      ) : (
                        <div className="space-y-6">
                          <div className="prose prose-invert max-w-none prose-lg">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={MarkdownComponents}
                            >
                              {message.parts?.[message.currentPartIndex || 0] || ''}
                            </ReactMarkdown>
                          </div>
                          
                          {message.parts && message.parts.length > 1 && (
                            <div className="flex flex-col items-center pt-6 border-t border-gray-700/50 space-y-4">
                              <div className="flex items-center space-x-2 mb-2">
                                {message.parts.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setMessages(prev => prev.map((msg, i) => 
                                      i === index ? { ...msg, currentPartIndex: idx } : msg
                                    ))}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 
                                      ${idx === message.currentPartIndex 
                                        ? 'bg-primary w-6' 
                                        : 'bg-gray-600 hover:bg-gray-500'}`}
                                  />
                                ))}
                              </div>
                              <Navigation
                                onPrevious={handlePreviousPart}
                                onNext={handleNextPart}
                                currentIndex={message.currentPartIndex || 0}
                                totalParts={message.parts.length}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {message.type === 'ai' && message.relatedQueries && (
                      <div className="mt-6 animate-fadeIn">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">
                          People also asked:
                        </h3>
                        <div className="flex flex-col space-y-2">
                          {message.relatedQueries.map((query, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleRelatedQueryClick(query.query)}
                              className="group flex items-center justify-between text-sm bg-gray-800/30 
                                hover:bg-gray-700/30 text-gray-300 px-4 py-3 rounded-xl 
                                transition-all duration-300 border border-gray-700/50 
                                hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5
                                w-full text-left"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span>{query.query}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    query.type === 'prerequisite' ? 'bg-blue-500/20 text-blue-400' :
                                    query.type === 'extension' ? 'bg-green-500/20 text-green-400' :
                                    query.type === 'application' ? 'bg-purple-500/20 text-purple-400' :
                                    query.type === 'parallel' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    {query.type}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{query.context}</p>
                              </div>
                              <span className="text-primary opacity-70 group-hover:opacity-100 ml-3">+</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-6 mt-8">
            <SearchBar 
              key={`follow-up-${searchKey}`}
              onSearch={handleSearch} 
              placeholder="Ask a follow-up question..."
              centered={false}
              className="bg-gray-900/80 backdrop-blur-lg border border-gray-700/50 shadow-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

ExploreView.displayName = 'ExploreView';
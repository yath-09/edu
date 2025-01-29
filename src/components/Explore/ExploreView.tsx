// src/components/Explore/ExploreView.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useApi } from '../../hooks/useApi';
import { SearchBar } from '../../components/shared/SearchBar';
import { GPTService } from '../../services/gptService';

interface Message {
  type: 'user' | 'ai';
  content: string;
  parts?: string[];
  relatedQueries?: string[];
  id?: string;
  currentPartIndex?: number;
}

interface ExploreViewProps {
  initialQuery?: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onRelatedQueryClick?: (query: string) => void;
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

const MarkdownComponents = {
  h1: ({ node, ...props }) => (
    <h1 className="text-2xl font-bold text-gray-100 mt-6 mb-4" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-xl font-semibold text-gray-100 mt-5 mb-3" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="text-gray-300 my-2 text-base leading-relaxed" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="list-disc list-inside my-2 text-gray-300" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal list-inside my-2 text-gray-300" {...props} />
  ),
  li: ({ node, ...props }) => (
    <li className="my-1 text-gray-300" {...props} />
  ),
  code: ({ node, inline, ...props }) => (
    inline 
      ? <code className="bg-gray-700 px-1 rounded text-sm" {...props} />
      : <code className="block bg-gray-700 p-2 rounded my-2 text-sm overflow-x-auto" {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-4 border-gray-500 pl-4 my-2 text-gray-400 italic" {...props} />
  ),
};

const processContent = (content: string): string => {
  if (!content) return '';
  
  // Remove any section prefixes
  return content
    .replace(/^(First|Second|Third|Fourth|Fifth)\s+[Ss]ection:?\s*/gm, '')
    .replace(/^[Ss]ection\s*\d*:?\s*/gm, '')
    .replace(/^[Pp]art\s*\d*:?\s*/gm, '')
    .replace(/^(Introduction|Overview):?\s*/gm, '')
    .trim();
};

export const ExploreView = React.memo(({ 
  initialQuery, 
  onError, 
  onSuccess,
  onRelatedQueryClick 
}: ExploreViewProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [showInitialSearch, setShowInitialSearch] = useState(true);
  const [searchKey, setSearchKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const gptService = useMemo(() => new GPTService(), []);
  const userContext = { /* your user context here */ };
  const [content, setContent] = useState<ExploreResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

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
      onSuccess();
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

  const handlePreviousPart = useCallback(() => {
    setMessages(prev => {
      const lastMessageIndex = prev.length - 1;
      return prev.map((msg, idx) => {
        if (idx === lastMessageIndex && msg.type === 'ai' && msg.currentPartIndex && msg.currentPartIndex > 0) {
          return {
            ...msg,
            currentPartIndex: msg.currentPartIndex - 1
          };
        }
        return msg;
      });
    });
  }, []);

  const handleNextPart = useCallback(() => {
    setMessages(prev => {
      const lastMessageIndex = prev.length - 1;
      return prev.map((msg, idx) => {
        if (idx === lastMessageIndex && msg.type === 'ai' && msg.parts && 
            msg.currentPartIndex !== undefined && msg.currentPartIndex < msg.parts.length - 1) {
          return {
            ...msg,
            currentPartIndex: msg.currentPartIndex + 1
          };
        }
        return msg;
      });
    });
  }, []);

  const handleExplore = async (query: string, previousContext?: string) => {
    setIsLoading(true);
    try {
      const response = await gptService.getExploreContent(query, userContext, previousContext);
      setContent(response);
      setCurrentQuery(query);
    } catch (error) {
      console.error('Full error details:', error);
      onError('Failed to load content');
    }
    setIsLoading(false);
  };

  const handleKnowMore = async () => {
    if (!content?.context || !currentQuery) return;
    
    setIsLoading(true);
    try {
      const moreContent = await gptService.getExploreContent(
        currentQuery,
        userContext,
        content.context
      );
      
      // Append new content to existing content
      setContent(prev => prev ? {
        parts: [...prev.parts, ...moreContent.parts],
        relatedQueries: moreContent.relatedQueries,
        context: moreContent.context
      } : moreContent);
      
    } catch (error) {
      console.error('Error loading more content:', error);
      onError('Failed to load additional content');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  const currentMessage = messages[messages.length - 1];
  const hasMultipleParts = currentMessage?.parts && currentMessage.parts.length > 1;
  const showNavigation = currentMessage?.type === 'ai' && hasMultipleParts;

  const formatRelatedQuery = (query: string): string => {
    return query
      .replace(/\?+/g, '?') // Replace multiple question marks with single one
      .replace(/\s+\?/g, '?') // Remove space before question mark
      .replace(/^(What|How|Why|Can|Is|Are|Does|Do)\s/, '') // Remove common question starters
      .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
  };

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
                              <div className="flex items-center space-x-4">
                                <button
                                  onClick={() => handlePreviousPart()}
                                  disabled={!message.currentPartIndex}
                                  className={`px-4 py-2 rounded-lg transition-all duration-200 
                                    ${!message.currentPartIndex
                                      ? 'text-gray-500 cursor-not-allowed'
                                      : 'text-white hover:bg-gray-700/70 hover:shadow-lg'}`}
                                >
                                  ← Previous
                                </button>
                                <span className="text-gray-400">
                                  {(message.currentPartIndex || 0) + 1} / {message.parts.length}
                                </span>
                                <button
                                  onClick={() => handleNextPart()}
                                  disabled={message.currentPartIndex === message.parts.length - 1}
                                  className={`px-4 py-2 rounded-lg transition-all duration-200
                                    ${message.currentPartIndex === message.parts.length - 1
                                      ? 'text-gray-500 cursor-not-allowed'
                                      : 'text-white hover:bg-gray-700/70 hover:shadow-lg'}`}
                                >
                                  Next →
                                </button>
                              </div>
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
});

ExploreView.displayName = 'ExploreView';
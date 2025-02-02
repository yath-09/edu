// src/components/Explore/ExploreView.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { SearchBar } from '../shared/SearchBar';
import { GPTService } from '../../services/gptService';
import { UserContext, MarkdownComponentProps } from '../../types';
import { RelatedTopics } from './RelatedTopics';
import { RelatedQuestions } from './RelatedQuestions';
import { LoadingAnimation } from '../shared/LoadingAnimation';

interface Message {
  type: 'user' | 'ai';
  content?: string;
  relatedTopics?: Array<{
    topic: string;
    type: string;
  }>;
  relatedQuestions?: Array<{
    question: string;
    type: string;
    context: string;
  }>;
}

interface ExploreViewProps {
  initialQuery?: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onRelatedQueryClick?: (query: string) => void;
  userContext: UserContext;
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
    <h1 className="text-xl sm:text-2xl font-bold text-gray-100 mt-4 mb-2" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-lg sm:text-xl font-semibold text-gray-100 mt-3 mb-2" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-base sm:text-lg font-medium text-gray-200 mt-2 mb-1" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="text-sm sm:text-base text-gray-300 my-1.5 leading-relaxed 
      break-words" {...props}>
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
      <code className="bg-gray-700 px-1 rounded text-xs sm:text-sm" {...props}>{children}</code> :
      <code className="block bg-gray-700 p-2 rounded my-2 text-xs sm:text-sm overflow-x-auto" {...props}>
        {children}
      </code>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-4 border-gray-500 pl-4 my-2 text-gray-400 italic" {...props}>
      {children}
    </blockquote>
  ),
};

export const RelatedQueries: React.FC<{
  queries: Array<{
    query: string;
    type: string;
    context: string;
  }>;
  onQueryClick: (query: string) => void;
}> = ({ queries, onQueryClick }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'curiosity': return 'bg-blue-500/20 text-blue-400';
      case 'mechanism': return 'bg-green-500/20 text-green-400';
      case 'causality': return 'bg-yellow-500/20 text-yellow-400';
      case 'innovation': return 'bg-purple-500/20 text-purple-400';
      case 'insight': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="mt-6 pt-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3 px-2">
        Follow-up Questions
      </h3>
      <div className="rounded-lg bg-gray-800/50 divide-y divide-gray-700/50">
        {queries.map((query, index) => (
          <button
            key={index}
            onClick={() => onQueryClick(query.query)}
            className="w-full text-left hover:bg-gray-700/30 transition-all 
              duration-200 group first:rounded-t-lg last:rounded-b-lg"
          >
            <div className="py-3 px-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-200 group-hover:text-primary 
                      transition-colors line-clamp-2">
                      {query.query}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full 
                      font-medium ${getTypeColor(query.type)}`}>
                      {query.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-1">
                    {query.context}
                  </p>
                </div>
                <span className="text-gray-400 group-hover:text-primary 
                  transition-colors text-lg">
                  →
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const scrollIntoView = () => {
    const scrollHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const scrollPosition = scrollHeight - windowHeight - 200; // 200px offset for the search bar

    window.scrollTo({
      top: Math.max(0, scrollPosition),
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    if (messages.length > 0) {
      // Wait for content to render
      const timer = setTimeout(() => {
        scrollIntoView();
      }, 200); // Slightly longer delay to ensure content is rendered
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleSearch = useCallback(async (query: string) => {
    try {
      setIsLoading(true);
      
      // Add user message
      setMessages(prev => [...prev, { 
        type: 'user', 
        content: query 
      }]);

      // Add loading message
      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: '' 
      }]);

      setShowInitialSearch(false);
      setSearchKey(prev => prev + 1);

      const response = await gptService.getExploreContent(query, userContext);
      
      if (!response || !response.content) {
        throw new Error('Invalid response received');
      }

      // Update with actual response
      setMessages(prev => [
        ...prev.slice(0, -1),
        { 
          type: 'ai', 
          content: response.content,
          relatedTopics: response.relatedTopics,
          relatedQuestions: response.relatedQuestions
        }
      ]);
      
      onSuccess('Content loaded successfully');
    } catch (error) {
      console.error('Search error:', error);
      onError(error instanceof Error ? error.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [gptService, onError, onSuccess, userContext]);

  const handleRelatedQueryClick = useCallback((query: string) => {
    if (onRelatedQueryClick) {
      onRelatedQueryClick(query);
    }
    handleSearch(query);
  }, [onRelatedQueryClick, handleSearch]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col" ref={containerRef}>
      {showInitialSearch ? (
        <div className="flex-1 flex items-center pt-16 sm:pt-0">
          <div className="w-full px-4 sm:max-w-2xl lg:max-w-3xl mx-auto">
            <div className="text-center space-y-4 mb-8">
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r 
                from-primary to-purple-500 bg-clip-text text-transparent">
                {/* ... */}
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
              className="bg-gray-900/80 backdrop-blur-lg"
            />
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col w-full">
          <div className="space-y-2 pb-16">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className="px-2 sm:px-4 w-full mx-auto"
              >
                <div className="max-w-3xl mx-auto w-full">
                  <div className="flex items-start gap-2 sm:gap-3">
                    {message.type === 'user' ? (
                      <div className="user-message flex items-start gap-2 sm:gap-3 w-full">
                        <UserAvatar />
                        <div className="flex-1 text-sm sm:text-base min-w-0">{message.content}</div>
                      </div>
                    ) : (
                      <div className="ai-message flex items-start gap-2 sm:gap-3 w-full">
                        <ProfessorAvatar />
                        <div className="flex-1 min-w-0">
                          {isLoading && !message.content ? (
                            <LoadingAnimation />
                          ) : (
                            <>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={MarkdownComponents}
                                className="whitespace-pre-wrap break-words space-y-1.5"
                              >
                                {message.content || ''}
                              </ReactMarkdown>

                              {message.relatedTopics && message.relatedTopics.length > 0 && (
                                <div className="mt-2 -mx-2 sm:mx-0">
                                  <RelatedTopics
                                    topics={message.relatedTopics}
                                    onTopicClick={handleRelatedQueryClick}
                                  />
                                </div>
                              )}

                              {message.relatedQuestions && message.relatedQuestions.length > 0 && (
                                <div className="mt-2 -mx-2 sm:mx-0">
                                  <RelatedQuestions
                                    questions={message.relatedQuestions}
                                    onQuestionClick={handleRelatedQueryClick}
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div 
              ref={messagesEndRef}
              className="h-8 w-full"
              aria-hidden="true"
            />
          </div>

          <div className="fixed bottom-0 left-0 right-0 
            bg-gradient-to-t from-background via-background to-transparent 
            pb-2 pt-3">
            <div className="w-full px-2 sm:px-4 max-w-3xl mx-auto">
              <SearchBar
                key={`follow-up-${searchKey}`}
                onSearch={handleSearch} 
                placeholder="Ask a follow-up question..."
                centered={false}
                className="bg-gray-900/80 backdrop-blur-lg border border-gray-700/50"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ExploreView.displayName = 'ExploreView';
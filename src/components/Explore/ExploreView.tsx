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
      case 'prerequisite': return 'bg-blue-500/20 text-blue-400';
      case 'extension': return 'bg-green-500/20 text-green-400';
      case 'application': return 'bg-yellow-500/20 text-yellow-400';
      case 'parallel': return 'bg-purple-500/20 text-purple-400';
      case 'deeper': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="mt-4 sm:mt-6 border-t border-gray-800 pt-4">
      <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 px-2">People Also Asked</h3>
      <div className="divide-y divide-gray-800">
        {queries.map((query, index) => (
          <div key={index} className="group">
            <button
              onClick={() => onQueryClick(query.query)}
              className="w-full text-left hover:bg-gray-800/50 py-2 px-3 transition-all duration-200 relative"
            >
              <div className="flex items-center gap-2 pr-8">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-gray-200 group-hover:text-primary 
                      transition-colors truncate">
                      {query.query}
                    </span>
                    <span className={`text-[10px] px-1 py-0.5 rounded-full whitespace-nowrap ${getTypeColor(query.type)}`}>
                      {query.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                    {query.context}
                  </p>
                </div>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 
                  text-gray-500 group-hover:text-primary transition-colors">
                  +
                </span>
              </div>
            </button>
          </div>
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
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const [isFirstQuery, setIsFirstQuery] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToLatest = useCallback(() => {
    if (!isFirstQuery) {
      setTimeout(() => {
        latestMessageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [isFirstQuery]);

  const handleSearch = useCallback(async (query: string) => {
    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { 
        type: 'user', 
        content: query 
      }]);
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

      setMessages(prev => [
        ...prev.slice(0, -1),
        { 
          type: 'ai', 
          content: response.content,
          relatedTopics: response.relatedTopics,
          relatedQuestions: response.relatedQuestions
        }
      ]);
      
      if (isFirstQuery) {
        setIsFirstQuery(false);
      } else {
        scrollToLatest();
      }
      
      onSuccess('Content loaded successfully');
    } catch (error) {
      console.error('Search error:', error);
      onError(error instanceof Error ? error.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [gptService, onError, onSuccess, userContext, scrollToLatest, isFirstQuery]);

  const handleRelatedQueryClick = useCallback((query: string) => {
    if (onRelatedQueryClick) {
      onRelatedQueryClick(query);
    }
    handleSearch(query);
  }, [onRelatedQueryClick, handleSearch]);

  useEffect(() => {
    if (initialQuery) {
      setIsFirstQuery(true);
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  return (
    <div className="w-full min-h-screen flex flex-col md:max-w-4xl md:mx-auto">
      {showInitialSearch ? (
        <div className="flex-1 flex items-start md:items-center pt-32 md:pt-0">
          <div className="w-full px-2 md:max-w-3xl md:mx-auto">
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
        <div className="relative flex flex-col min-h-screen">
          <div className="space-y-4 sm:space-y-6 py-4 sm:py-6 pb-24 md:pb-20">
            <div className="space-y-3 sm:space-y-4" ref={messagesEndRef}>
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`message ${message.type} px-3 sm:px-4 md:px-0`}
                  ref={index === messages.length - 1 ? latestMessageRef : null}
                >
                  {message.type === 'user' ? (
                    <div className="user-message flex items-start gap-3">
                      <UserAvatar />
                      <div className="flex-1">{message.content}</div>
                    </div>
                  ) : (
                    <div className="ai-message flex items-start gap-3">
                      <ProfessorAvatar />
                      <div className="flex-1">
                        {isLoading && !message.content ? (
                          <LoadingAnimation />
                        ) : (
                          <>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={MarkdownComponents}
                              className="whitespace-pre-wrap"
                            >
                              {message.content || ''}
                            </ReactMarkdown>

                            {message.relatedTopics && message.relatedTopics.length > 0 && (
                              <RelatedTopics
                                topics={message.relatedTopics}
                                onTopicClick={handleRelatedQueryClick}
                              />
                            )}

                            {message.relatedQuestions && message.relatedQuestions.length > 0 && (
                              <RelatedQuestions
                                questions={message.relatedQuestions}
                                onQuestionClick={handleRelatedQueryClick}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="fixed md:sticky bottom-0 left-0 right-0 md:bottom-4 px-2 sm:px-4 md:px-0 
            bg-gradient-to-t from-background via-background to-transparent pb-4 pt-6">
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
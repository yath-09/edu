// src/components/Explore/ExploreView.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { SearchBar } from '../shared/SearchBar';
import { MarkdownComponentProps } from '../../types';
import { RelatedTopics } from './RelatedTopics';
import { RelatedQuestions } from './RelatedQuestions';
import { LoadingAnimation } from '../shared/LoadingAnimation';
import { streamExploreContent } from '../../services/backendGptServices';
import { Message } from '../../types';
import { ExploreViewProps } from '../../types';
import { StreamChunk } from '../../types';


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
  onRelatedQueryClick,
  userContext
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInitialSearch, setShowInitialSearch] = useState(!initialQuery);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const buttons = [
    { label: "Quantum Physics", searchQuery: "Quantum Physics", color: "purple" },
    { label: "Machine Learning", searchQuery: "Machine Learning", color: "blue" },
    { label: "World History", searchQuery: "World History", color: "green" }
  ];

  // Add a ref for the messages container
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // More reliable scroll to top function
  const scrollToBottom = useCallback(() => {
    // Check the number of messages
    if (messages.length <= 1) {
      // Scroll to top if there is only one message
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    } else {
      // Try scrolling container to the bottom if there are multiple messages
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });

      }
       // Fallback with setTimeout to ensure scroll happens after render
       setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
  
     
    }
  }, [messages.length]);  // Dependency array to trigger when messages change
  
  
  
  // Add effect to listen for reset
  useEffect(() => {
    const handleReset = () => {
      setMessages([]);
      setShowInitialSearch(true);
    };

    window.addEventListener('resetExplore', handleReset);
    return () => window.removeEventListener('resetExplore', handleReset);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    try {
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
  
      // Scroll before starting the search
      //scrollToTop();
      scrollToBottom();
  
      setIsLoading(true);
      
      // Set the initial state with the user's query and an empty AI message
      setMessages(prevMessages => [
        ...prevMessages,
        { type: 'user', content: query },
        { type: 'ai', content: '' }
      ]);
  
      setShowInitialSearch(false);
  
      // Adding a divider before new messages
      setMessages(prevMessages => [
        ...prevMessages,
        { type: 'divider' }  // Insert divider between old and new messages
      ]);
  
      // Call the API for streaming content
      await streamExploreContent(query, userContext, (chunk: StreamChunk) => {
        // Append the content chunk
        setMessages(prevMessages => {
          // Update the last AI message with the new chunk text
          const updatedMessages = [...prevMessages];
          const lastAIMessageIndex = updatedMessages.findIndex(
            message => message.type === 'ai' && !message.content
          );
  
          if (lastAIMessageIndex !== -1) {
            updatedMessages[lastAIMessageIndex] = {
              ...updatedMessages[lastAIMessageIndex],
              content: chunk.text,
              topics: chunk.topics,
              questions: chunk.questions
            };
          }
  
          return updatedMessages;
        });
      });
  
    } catch (error) {
      console.error('Search error:', error);
      onError(error instanceof Error ? error.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [onError, userContext,scrollToBottom]);
  
  


  const handleRelatedQueryClick = useCallback((query: string) => {
    // Scroll before handling the click
    scrollToBottom();
    if (onRelatedQueryClick) {
      onRelatedQueryClick(query);
    }
    handleSearch(query);
  }, [handleSearch, onRelatedQueryClick,scrollToBottom]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch,scrollToBottom]);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col" ref={containerRef}>
      {showInitialSearch ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            What do you want to explore?
          </h1>

          <div className="w-full max-w-xl mx-auto">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Enter what you want to explore..."
              centered={true}
              className="bg-gray-900/80"
            />

            <p className="text-sm text-gray-400 text-center mt-1">Press Enter to search</p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <span className="text-sm text-gray-400">Try:</span>
              {buttons.map((button, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(button.searchQuery)}
                  className={`px-3 py-1.5 rounded-lg bg-${button.color}-500/20 hover:bg-${button.color}-500/30 
        border border-${button.color}-500/30 transition-colors text-xs sm:text-sm text-${button.color}-300`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div ref={messagesContainerRef} className="relative flex flex-col w-full">
  <div className="space-y-2 pb-16">
    {messages.map((message, index) => (
      <div key={index} className="px-2 sm:px-4 w-full mx-auto">
        <div className="max-w-3xl mx-auto">
          {message.type === 'user' ? (
            <div className="w-full">
              <div className="flex-1 text-base sm:text-lg font-semibold text-gray-100">
                {message.content}
              </div>
            </div>
          ) : message.type === 'ai' ? (
            <div className="w-full">
              <div className="flex-1 min-w-0">
                {!message.content && isLoading ? (
                  <div className="flex items-center space-x-2 py-2">
                    <LoadingAnimation />
                    <span className="text-sm text-gray-400">Thinking...</span>
                  </div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      ...MarkdownComponents,
                      p: ({ children }) => (
                        <p className="text-sm sm:text-base text-gray-300 my-1.5 leading-relaxed break-words">
                          {children}
                        </p>
                      ),
                    }}
                    className="whitespace-pre-wrap break-words space-y-1.5"
                  >
                    {message.content || ''}
                  </ReactMarkdown>
                )}

                {message.topics && message.topics.length > 0 && (
                  <div className="mt-3">
                    <RelatedTopics
                      topics={message.topics}
                      onTopicClick={handleRelatedQueryClick}
                    />
                  </div>
                )}

                {message.questions && message.questions.length > 0 && (
                  <div className="mt-3 mb-20">
                    <RelatedQuestions
                      questions={message.questions}
                      onQuestionClick={handleRelatedQueryClick}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : message.type === 'divider' ? (
            <div className="w-full py-4 border-t-4 border-gray-600 text-center text-gray-400 mt-100">
            </div>
          ) : null}
        </div>
      </div>
    ))}
  </div>
</div>


      )}
    </div>
  );
};

ExploreView.displayName = 'ExploreView';
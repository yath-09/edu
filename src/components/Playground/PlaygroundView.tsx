// src/components/Playground/PlaygroundView.tsx
import React, { useState, useEffect } from 'react';
import { SearchBar } from '../shared/SearchBar';
import { Loading } from '../shared/Loading';
import { useApi } from '../../hooks/useApi';
import { Trophy, Timer, Target, Award, Pause, Play, Star } from 'lucide-react';

interface PlaygroundViewProps {
  initialQuery?: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  userContext: UserContext;
}

export const PlaygroundView = ({ initialQuery, onError, onSuccess, userContext }: PlaygroundViewProps) => {
  const { getQuestion } = useApi();
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [query, setQuery] = useState(initialQuery || '');
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [nextQuestionTimer, setNextQuestionTimer] = useState<NodeJS.Timeout | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [currentQuestionTime, setCurrentQuestionTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timer | null>(null);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState<number | null>(null);
  const [isQueueHealthy, setIsQueueHealthy] = useState(true);

  const [sessionStats, setSessionStats] = useState({
    totalQuestions: 0,
    sessionLimit: 25,
    isSessionComplete: false
  });

  const [usedQuestions, setUsedQuestions] = useState(new Set());

  const [stats, setStats] = useState({
    questions: 0,
    accuracy: 0,
    streak: 0,
    bestStreak: 0,
    avgTime: 0,
    level: 1,
    questionsToNextLevel: 5
  });

  // Add new state to track overall topic performance
  const [topicProgress, setTopicProgress] = useState(() => {
    const saved = localStorage.getItem(`topic-progress-${query}`);
    return saved ? JSON.parse(saved) : {
      totalAttempts: 0,
      successRate: 0,
      averageTime: 0,
      lastLevel: 1,
      masteryScore: 0  // 0-100 scale
    };
  });

  // Add a state for the next question
  const [nextQuestion, setNextQuestion] = useState<any>(null);

  const startQuestionTimer = () => {
    setQuestionStartTime(Date.now());
    const interval = setInterval(() => {
      setCurrentQuestionTime(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  };

  const stopQuestionTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const resetQuestionTimer = () => {
    setCurrentQuestionTime(0);
    setQuestionStartTime(null);
    stopQuestionTimer();
  };

  // Add a function to fetch next question in background
  const prefetchNextQuestion = async () => {
    try {
      const adjustedLevel = Math.min(10, Math.max(1, 
        stats.level + 
        (topicProgress.masteryScore > 80 ? 2 : 0) +
        (topicProgress.successRate > 70 ? 1 : 0) +
        (topicProgress.averageTime < 15 ? 1 : 0)
      ));

      const question = await getQuestion(query, adjustedLevel, {
        ...userContext,
        topicProgress: topicProgress
      });
      setNextQuestion(question);
    } catch (error) {
      console.error('Error prefetching next question:', error);
    }
  };

  // Modify fetchNewQuestion to use prefetched question
  const fetchNewQuestion = async () => {
    if (!query) return;
    
    if (sessionStats.totalQuestions >= sessionStats.sessionLimit) {
      setSessionStats(prev => ({ ...prev, isSessionComplete: true }));
      stopQuestionTimer();
      if (nextQuestionTimer) clearTimeout(nextQuestionTimer);
      onSuccess("Congratulations! You've completed your practice session! 🎉");
      return;
    }

    // Use prefetched question if available
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      setNextQuestion(null);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setIsPaused(false);
      resetQuestionTimer();
      startQuestionTimer();
      
      // Start prefetching next question immediately
      prefetchNextQuestion();
    } else {
      // Fallback to fetching directly if no prefetched question
      try {
        const adjustedLevel = Math.min(10, Math.max(1, 
          stats.level + 
          (topicProgress.masteryScore > 80 ? 2 : 0) +
          (topicProgress.successRate > 70 ? 1 : 0) +
          (topicProgress.averageTime < 15 ? 1 : 0)
        ));

        const question = await getQuestion(query, adjustedLevel, {
          ...userContext,
          topicProgress: topicProgress
        });

        setCurrentQuestion(question);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setIsPaused(false);
        resetQuestionTimer();
        startQuestionTimer();
        
        // Start prefetching next question
        prefetchNextQuestion();
      } catch (error) {
        console.error('Error fetching question:', error);
        onError('Failed to generate question. Please try again.');
      }
    }
  };

  const handleSearch = async (newQuery: string) => {
    try {
      setIsInitialLoading(true);
      // Clear question-specific state
      setCurrentQuestion(null);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setUsedQuestions(new Set());
      
      const isSameTopic = newQuery === query;
      setQuery(newQuery);
      
      if (!isSameTopic) {
        // Reset everything for new topic
        setTopicProgress({
          totalAttempts: 0,
          successRate: 0,
          averageTime: 0,
          lastLevel: 1,
          masteryScore: 0
        });
        setStats({
          questions: 0,
          accuracy: 0,
          streak: 0,
          bestStreak: 0,
          avgTime: 0,
          level: 1,
          questionsToNextLevel: 5
        });
      } else {
        // Continue with existing progress
        setStats(prev => ({
          ...prev,
          questions: 0, // Reset session questions
          streak: 0, // Reset streak
          level: topicProgress.lastLevel, // Keep previous level
          questionsToNextLevel: 5
        }));
      }
      
      setSessionStats({
        totalQuestions: 0,
        sessionLimit: 25,
        isSessionComplete: false
      });

      await fetchNewQuestion();
    } catch (error) {
      console.error('Search error:', error);
      onError('Failed to start practice session');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (nextQuestionTimer) {
      clearTimeout(nextQuestionTimer);
      setNextQuestionTimer(null);
    }
  };

  // Add a constant for countdown duration
  const COUNTDOWN_DURATION = 5; // 5 seconds to give more time for loading

  const updateStats = (isCorrect: boolean) => {
    setStats(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const newQuestions = prev.questions + 1;
      const newAccuracy = ((prev.accuracy * prev.questions) + (isCorrect ? 100 : 0)) / newQuestions;
      
      // Level progression
      let newLevel = prev.level;
      let newQuestionsToNextLevel = prev.questionsToNextLevel;
      
      if (isCorrect) {
        newQuestionsToNextLevel--;
        if (newQuestionsToNextLevel <= 0) {
          newLevel++;
          newQuestionsToNextLevel = 5;
          onSuccess(`Level Up! You're now level ${newLevel} 🎉`);
        }
      }

      // Update session progress
      setSessionStats(prev => {
        const newTotal = prev.totalQuestions + 1;
        const isComplete = newTotal >= prev.sessionLimit;
        
        if (isComplete) {
          stopQuestionTimer();
          if (nextQuestionTimer) clearTimeout(nextQuestionTimer);
          onSuccess("Congratulations! You've completed your practice session! 🎉");
        }
        
        return {
          ...prev,
          totalQuestions: newTotal,
          isSessionComplete: isComplete
        };
      });

      // Streak notifications
      if (newStreak === 2) {
        onSuccess('Great streak! Keep going! 🔥');
      } else if (newStreak === 5) {
        onSuccess('Unstoppable! 🚀');
      } else if (newStreak === 10) {
        onSuccess('Legendary! 🌟');
      }

      return {
        ...prev,
        questions: newQuestions,
        accuracy: Number(newAccuracy.toFixed(1)),
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        level: newLevel,
        questionsToNextLevel: newQuestionsToNextLevel
      };
    });
  };

  const startCountdown = () => {
    setNextQuestionCountdown(COUNTDOWN_DURATION);
    const interval = setInterval(() => {
      setNextQuestionCountdown(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          return null;
        }
        return prev - 0.1;
      });
    }, 100);
  };

  const handleAnswer = async (selectedIndex: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(selectedIndex);
    setShowExplanation(true);
    stopQuestionTimer();

    // Update stats only
    const isCorrect = selectedIndex === currentQuestion.correctAnswer;
    updateStats(isCorrect);

    // Instead of loading immediately, set a timer for the next question
    if (!isPaused) {
      const timer = setTimeout(() => {
        fetchNewQuestion();
      }, COUNTDOWN_DURATION * 1000);
      setNextQuestionTimer(timer);
      startCountdown();
    }
  };

  useEffect(() => {
    if (query) {
      fetchNewQuestion();
    }
  }, [query]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
    
    // Cleanup on unmount or when initialQuery changes
    return () => {
      if (nextQuestionTimer) clearTimeout(nextQuestionTimer);
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [initialQuery]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // Update SessionProgress to be LevelProgress
  const LevelProgress = () => (
    <div className="mb-4">
      <div className="flex justify-between text-sm text-gray-400 mb-2">
        <span>Level {stats.level}</span>
        <span>{stats.questionsToNextLevel} more correct answers to level {stats.level + 1}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className="bg-primary rounded-full h-2 transition-all duration-300"
          style={{ 
            width: `${((5 - stats.questionsToNextLevel) / 5) * 100}%` 
          }}
        />
      </div>
    </div>
  );

  // Add this helper function at the top of the file
  const formatTime = (time: number): string => {
    return time.toFixed(1);
  };

  // Add new component for Progress Ring
  const ProgressRing = ({ progress, size = 40, strokeWidth = 3 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            className="text-gray-700"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className="text-primary transition-all duration-300 ease-in-out"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <span className="absolute text-sm font-medium">{sessionStats.totalQuestions}</span>
      </div>
    );
  };

  // Reset used questions when changing topics
  useEffect(() => {
    setUsedQuestions(new Set());
  }, [query]);

  // Add cleanup effect
  useEffect(() => {
    // Cleanup function
    return () => {
      setCurrentQuestion(null);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setIsPaused(false);
      setNextQuestionTimer(null);
      setQuestionStartTime(null);
      setCurrentQuestionTime(0);
      setNextQuestionCountdown(null);
      setUsedQuestions(new Set());
      setStats({
        questions: 0,
        accuracy: 0,
        streak: 0,
        bestStreak: 0,
        avgTime: 0,
        level: 1,
        questionsToNextLevel: 5
      });
      
      // Clear any running timers
      if (timerInterval) clearInterval(timerInterval);
      if (nextQuestionTimer) clearTimeout(nextQuestionTimer);
    };
  }, []);

  // Start prefetching when current question is displayed
  useEffect(() => {
    if (currentQuestion && !nextQuestion) {
      prefetchNextQuestion();
    }
  }, [currentQuestion]);

  if (isInitialLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 min-h-screen flex flex-col">
      {!currentQuestion || sessionStats.isSessionComplete ? (
        <div className="flex-1 flex items-center justify-center">
          {sessionStats.isSessionComplete ? (
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-white">Great Practice Session! 🎉</h2>
              <div className="space-y-4 text-gray-300">
                <p className="text-lg">You've completed {sessionStats.totalQuestions} questions</p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-green-500">{stats.accuracy}%</p>
                    <p className="text-sm text-gray-400">Accuracy</p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-500">{stats.bestStreak}</p>
                    <p className="text-sm text-gray-400">Best Streak</p>
                  </div>
                </div>
                
                <div className="mt-8 space-y-4">
                  <button
                    onClick={() => {
                      setSessionStats(prev => ({
                        ...prev,
                        totalQuestions: 0,
                        isSessionComplete: false
                      }));
                      handleSearch(query);
                    }}
                    className="w-full px-6 py-3 bg-primary hover:bg-primary-dark rounded-lg
                      transition-colors duration-200 text-white font-medium"
                  >
                    Practice More {query}
                  </button>
                  
                  <button
                    onClick={() => {
                      setQuery('');
                      setSessionStats(prev => ({
                        ...prev,
                        totalQuestions: 0,
                        isSessionComplete: false
                      }));
                    }}
                    className="w-full px-6 py-3 border border-gray-600 hover:border-gray-500 
                      rounded-lg transition-colors duration-200 text-gray-300 font-medium"
                  >
                    Try Different Topic
                  </button>
                </div>
                
                {stats.accuracy >= 80 && (
                  <p className="text-green-500 mt-4">
                    Excellent work! You're mastering this topic! 🌟
                  </p>
                )}
                {stats.accuracy >= 60 && stats.accuracy < 80 && (
                  <p className="text-yellow-500 mt-4">
                    Good progress! Keep practicing to improve! 💪
                  </p>
                )}
                {stats.accuracy < 60 && (
                  <p className="text-blue-500 mt-4">
                    Practice makes perfect! Don't give up! 🎯
                  </p>
                )}
              </div>
            </div>
          ) : (
            <SearchBar
              key="initial-search"
              onSearch={handleSearch}
              placeholder="Enter what you want to practice..."
              centered={true}
              title="What do you want to practice?"
            />
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="card">
              <div className="flex items-center justify-between">
                <span className="stats-value text-primary">{stats.questions}</span>
                <Target className="w-5 h-5 text-primary" />
              </div>
              <span className="stats-label">Questions</span>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between">
                <span className="stats-value text-green-500">{stats.accuracy}%</span>
                <Trophy className="w-5 h-5 text-green-500" />
              </div>
              <span className="stats-label">Accuracy</span>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between">
                <span className="stats-value text-yellow-500">{stats.streak}</span>
                <Award className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="stats-label">Streak</span>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between">
                <span className="stats-value text-purple-500">
                  {currentQuestionTime}s
                </span>
                <Timer className="w-5 h-5 text-purple-500" />
              </div>
              <span className="stats-label">Time</span>
            </div>
          </div>

          {/* Level Progress */}
          <LevelProgress />

          {/* Question Card */}
          <div className="card space-y-6">
            <div className="flex justify-between items-start">
              <h2 className="text-base font-medium leading-relaxed text-gray-200 
                max-w-3xl whitespace-pre-line tracking-wide">
                {currentQuestion.text.split(' ').length > 20 
                  ? currentQuestion.text.split('.').map((sentence, idx) => (
                      <span key={idx} className="block mb-1">{sentence.trim()}.</span>
                    ))
                  : currentQuestion.text
                }
              </h2>
              <button
                onClick={togglePause}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
              >
                {isPaused ? (
                  <Play className="w-5 h-5 text-primary" />
                ) : (
                  <Pause className="w-5 h-5 text-primary" />
                )}
              </button>
            </div>
            
            <div className="space-y-2">
              {currentQuestion.options.map((option: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all 
                    text-sm leading-relaxed ${
                      selectedAnswer === null 
                        ? 'bg-card hover:bg-gray-800'
                        : idx === currentQuestion.correctAnswer
                          ? 'bg-green-500/20 text-green-500'
                          : selectedAnswer === idx
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-card'
                    }`}
                >
                  <span className="inline-block w-6 font-medium">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </button>
              ))}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className={`px-4 py-3 rounded-lg animate-fade-in ${
                selectedAnswer === currentQuestion.correctAnswer
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-red-500/20 text-red-500'
              }`}>
                <p className="text-sm">{currentQuestion.explanation}</p>
                
                {/* Simplified Countdown */}
                {!isPaused && nextQuestionCountdown !== null && (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <div className="relative h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-primary transition-all duration-100"
                        style={{ 
                          width: `${(nextQuestionCountdown / COUNTDOWN_DURATION) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 text-sm text-gray-400 text-center">
                      Next question in {nextQuestionCountdown.toFixed(0)}s
                    </div>
                  </div>
                )}

                {isPaused && (
                  <div className="mt-4 border-t border-gray-700 pt-4 text-center">
                    <button
                      onClick={fetchNewQuestion}
                      className="text-sm text-primary hover:text-primary/80 
                        transition-colors duration-200"
                    >
                      Next Question
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
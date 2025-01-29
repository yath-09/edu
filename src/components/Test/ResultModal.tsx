import type { FC } from 'react';
import { XCircle } from 'lucide-react';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  totalQuestions: number;
  accuracy: number;
  averageTime: number;
  topic: string;
  rankPrediction: number;
}

export const ResultModal: FC<ResultModalProps> = ({ 
  isOpen, 
  onClose, 
  score, 
  totalQuestions, 
  accuracy, 
  averageTime,
  topic,
  rankPrediction 
}) => {
  if (!isOpen) return null;

  const getTopicAnalysis = (accuracy: number, averageTime: number) => {
    if (accuracy >= 85 && averageTime < 60) {
      return {
        status: 'Excellent',
        color: 'text-green-500',
        message: `Your performance in ${topic} is outstanding! You're well-prepared for competitive exams.`,
        suggestion: 'Focus on maintaining this level while exploring advanced concepts.'
      };
    } else if (accuracy >= 70 && averageTime < 90) {
      return {
        status: 'Good',
        color: 'text-blue-500',
        message: `You have a strong grasp of ${topic}. Keep refining your skills.`,
        suggestion: 'Work on improving speed while maintaining accuracy.'
      };
    } else if (accuracy >= 50) {
      return {
        status: 'Fair',
        color: 'text-yellow-500',
        message: `You're making progress in ${topic}, but there's room for improvement.`,
        suggestion: 'Focus on understanding core concepts and practice regularly.'
      };
    } else {
      return {
        status: 'Needs Work',
        color: 'text-red-500',
        message: `Your ${topic} fundamentals need strengthening.`,
        suggestion: 'Start with basic concepts and gradually build up complexity.'
      };
    }
  };

  const analysis = getTopicAnalysis(accuracy, averageTime);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 animate-fade-in">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-white">Test Results</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Score Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">{score}/{totalQuestions}</div>
              <div className="text-sm text-gray-400">Score</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-500">{accuracy}%</div>
              <div className="text-sm text-gray-400">Accuracy</div>
            </div>
          </div>

          {/* Topic Analysis */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-white">Topic Analysis: {topic}</h3>
            <div className={`text-lg font-medium ${analysis.color}`}>
              Status: {analysis.status}
            </div>
            <p className="text-gray-300">{analysis.message}</p>
            <p className="text-gray-400 text-sm">{analysis.suggestion}</p>
          </div>

          {/* Rank Prediction */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-white">Rank Prediction</h3>
            <div className="text-lg text-primary">
              Based on your {topic} preparation, your estimated rank: 
              <span className="font-bold ml-2">#{rankPrediction.toLocaleString()}</span>
            </div>
            <p className="text-gray-400 text-sm">
              This prediction is based on your performance in {topic} and historical data patterns.
            </p>
          </div>

          {/* Time Analysis */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-lg text-purple-500">
              Average Time per Question: {averageTime.toFixed(1)}s
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {averageTime < 60 
                ? "Great time management! You're solving questions efficiently."
                : "Try to improve your speed while maintaining accuracy."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg
                transition-colors duration-200"
            >
              Continue Practice
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-700 hover:border-gray-600 rounded-lg
                transition-colors duration-200"
            >
              Review Answers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

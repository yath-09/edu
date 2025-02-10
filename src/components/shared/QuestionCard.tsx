interface QuestionCardProps {
  question: {
    text: string;
    options: string[];
    explanation?: string;
  };
  selectedAnswer: number | null;
  correctAnswer?: number;
  onAnswer: (index: number) => void;
  showExplanation?: boolean;
  disabled?: boolean;
}

export const QuestionCard = ({
  question,
  selectedAnswer,
  correctAnswer,
  onAnswer,
  showExplanation,
  disabled
}: QuestionCardProps) => {
  return (
    <div className="card space-y-6">
      <h2 className="text-xl font-medium">{question.text}</h2>
      
      <div className="space-y-3">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => onAnswer(idx)}
            disabled={disabled || selectedAnswer !== null}
            className={`option-button ${
              selectedAnswer === null 
                ? ''
                : correctAnswer !== undefined
                  ? idx === correctAnswer
                    ? 'correct'
                    : selectedAnswer === idx
                      ? 'incorrect'
                      : ''
                  : selectedAnswer === idx
                    ? 'bg-primary/20 border-primary'
                    : ''
            }`}
          >
            {String.fromCharCode(65 + idx)}. {option}
          </button>
        ))}
      </div>

      {showExplanation && question.explanation && selectedAnswer !== null && (
        <div className={`p-4 rounded-lg ${
          selectedAnswer === correctAnswer
            ? 'bg-success/20 text-success'
            : 'bg-error/20 text-error'
        }`}>
          <p>{question.explanation}</p>
        </div>
      )}
    </div>
  );
};
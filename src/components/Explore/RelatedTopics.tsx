interface RelatedTopicsProps {
  topics: Array<{
    topic: string;
    type: string;
    reason: string;
  }>;
  onTopicClick: (topic: string) => void;
}

export const RelatedTopics: React.FC<RelatedTopicsProps> = ({ topics, onTopicClick }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'prerequisite': 
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30';
      case 'extension': 
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30';
      case 'application': 
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30';
      case 'parallel': 
        return 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 hover:bg-fuchsia-500/30';
      case 'deeper': 
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30';
      default: 
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30';
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-4 mb-6">
      {topics.map((topic, index) => (
        <button
          key={index}
          onClick={() => onTopicClick(topic.topic)}
          className={`px-3 py-1 rounded-full text-xs font-medium border 
            transition-all duration-200 hover:scale-105 
            ${getTypeColor(topic.type)}`}
        >
          {topic.topic}
        </button>
      ))}
    </div>
  );
}; 
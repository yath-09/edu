// src/services/api.ts
import axios from 'axios';
import { GPTService } from './gptService';

// Types
interface ExploreResponse {
  parts: string[];
  relatedQueries: string[];
}

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: number;
  ageGroup: string;
  topic: string;
  subtopic: string;
}

interface UserContext {
  age: number;
}

// Add this interface for topic contexts
interface TopicContext {
  contexts: string[];
  concepts: string[];
  realWorldApplications: string[];
  difficulty: {
    Elementary: string[];
    'Middle School': string[];
    'High School': string[];
    Advanced: string[];
  };
}

// Add this to track used questions more effectively
interface QuestionHistory {
  usedQuestions: Set<string>;
  lastLevel: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  topicStrength: number;  // 0-1 scale to track topic mastery
}

// Add a question queue system
interface QuestionQueue {
  questions: Question[];
  isLoading: boolean;
  minQueueSize: number;
  maxQueueSize: number;
}

const api = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
  }
});

const gptService = new GPTService();

// Add comprehensive topic contexts
const topicContexts: Record<string, TopicContext> = {
  'probability': {
    contexts: [
      'Sports and games',
      'Weather forecasting',
      'Card games',
      'Board games',
      'Color combinations',
      'Music playlists',
      'Food and restaurants',
      'School events',
      'Social media',
      'Transportation',
      'Shopping and sales',
      'Entertainment choices',
      'Book selections',
      'Pet behaviors',
      'Birthday scenarios'
    ],
    concepts: [
      'Simple probability',
      'Compound events',
      'Independent events',
      'Dependent events',
      'Conditional probability',
      'Experimental probability',
      'Theoretical probability',
      'Sample space',
      'Probability distributions',
      'Expected value'
    ],
    realWorldApplications: [
      'Game strategies',
      'Decision making',
      'Risk assessment',
      'Weather prediction',
      'Insurance calculations',
      'Medical diagnoses',
      'Quality control',
      'Election predictions',
      'Genetic inheritance',
      'Market research'
    ],
    difficulty: {
      'Elementary': [
        'Simple coin flips',
        'Single die rolls',
        'Colored marble selection',
        'Card color picking',
        'Weather prediction',
        'Favorite food choices',
        'Pet selection scenarios',
        'Simple game outcomes'
      ],
      'Middle School': [
        'Sports statistics',
        'Multiple coin flips',
        'Card game scenarios',
        'Weather patterns',
        'Game tournament outcomes',
        'School event planning',
        'Music playlist shuffling',
        'Social media engagement'
      ],
      'High School': [
        'Complex card combinations',
        'Sports tournament predictions',
        'Medical diagnosis accuracy',
        'Genetic inheritance patterns',
        'Market research data',
        'Insurance risk assessment',
        'Quality control processes',
        'Election polling analysis'
      ],
      'Advanced': [
        'Stock market predictions',
        'Scientific research outcomes',
        'Complex game theory',
        'Machine learning probability',
        'Quantum probability',
        'Actuarial calculations',
        'Epidemiological models',
        'Cryptographic applications'
      ]
    }
  },
  // Add more topics with their contexts...
};

const questionHistoryMap: Record<string, QuestionHistory> = {};

// Add queue management functions
const questionQueues: Record<string, QuestionQueue> = {};

// First, create a class to handle the question queue
class QuestionQueueManager {
  private queues: Record<string, QuestionQueue> = {};

  initializeQueue(topicKey: string): QuestionQueue {
    if (!this.queues[topicKey]) {
      this.queues[topicKey] = {
        questions: [],
        isLoading: false,
        minQueueSize: 3,
        maxQueueSize: 10
      };
    }
    return this.queues[topicKey];
  }

  getQueue(topicKey: string): QuestionQueue {
    return this.queues[topicKey] || this.initializeQueue(topicKey);
  }
}

// Create a singleton instance
const queueManager = new QuestionQueueManager();

// Update the cleanAndParseJSON function
const cleanAndParseJSON = (jsonString: string) => {
  try {
    // First attempt: direct parse
    return JSON.parse(jsonString);
  } catch (error) {
    try {
      // Log the problematic response
      console.log('Problematic API response:', jsonString);

      // Clean the string more aggressively
      let cleaned = jsonString
        // Remove any BOM or special characters
        .replace(/^\uFEFF/, '')
        // Remove any non-printable characters
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        // Ensure property names are properly quoted
        .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
        // Fix escaped quotes
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        // Fix any remaining unescaped quotes
        .replace(/"([^"\\]*)"/g, function(match) {
          return match.replace(/[\n\r\t]/g, ' ');
        })
        // Remove multiple spaces
        .replace(/\s+/g, ' ')
        .trim();

      // Add fallback structure if parsing fails
      try {
        return JSON.parse(cleaned);
      } catch (parseError) {
        console.error('Failed to parse cleaned JSON:', cleaned);
        // Return a default question structure
        return {
          text: "An error occurred while generating the question. Please try again.",
          options: [
            "Option A",
            "Option B",
            "Option C",
            "Option D"
          ],
          correctAnswer: 0,
          explanation: "Please click next to get a new question.",
          difficulty: 1,
          ageGroup: "any",
          topic: "error",
          subtopic: "error"
        };
      }
    } catch (cleanError) {
      console.error('JSON cleaning failed:', cleanError);
      throw new Error('Failed to process API response');
    }
  }
};

// Update the normalizeTopicName function
function normalizeTopicName(topic: string): string {
  const commonMisspellings: Record<string, string> = {
    // Math subjects
    'probablity': 'probability',
    'probabilty': 'probability',
    'algebr': 'algebra',
    'alzebra': 'algebra',
    'algbra': 'algebra',
    'alg': 'algebra',
    'math': 'mathematics',
    'maths': 'mathematics',
    'mathematic': 'mathematics',
    'geometr': 'geometry',
    'geomtry': 'geometry',
    'trignometry': 'trigonometry',
    'trig': 'trigonometry',
    'calc': 'calculus',
    'stats': 'statistics',
    'stat': 'statistics',
    'statistic': 'statistics',

    // Science subjects
    'chem': 'chemistry',
    'chemstry': 'chemistry',
    'chemisty': 'chemistry',
    'phys': 'physics',
    'physic': 'physics',
    'bio': 'biology',
    'biolog': 'biology'
  };

  const normalized = topic.toLowerCase().trim();
  
  // Check for exact misspelling matches
  if (commonMisspellings[normalized]) {
    return commonMisspellings[normalized];
  }

  // Check for partial matches
  for (const [misspelled, correct] of Object.entries(commonMisspellings)) {
    if (normalized.includes(misspelled)) {
      return correct;
    }
  }

  // Fuzzy matching for common subjects
  const commonSubjects = [
    'algebra', 'geometry', 'trigonometry', 'calculus',
    'probability', 'statistics', 'physics', 'chemistry', 'biology'
  ];

  // Find the closest match using Levenshtein distance
  let closestMatch = normalized;
  let minDistance = Infinity;

  for (const subject of commonSubjects) {
    const distance = levenshteinDistance(normalized, subject);
    if (distance < minDistance && distance <= 3) { // Allow up to 3 character differences
      minDistance = distance;
      closestMatch = subject;
    }
  }

  return closestMatch;
}

// Add Levenshtein distance calculation
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(a.length + 1).fill(null).map(() => 
    Array(b.length + 1).fill(null)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

// Update the gptApi object
export const gptApi = {
  explore: async (query: string, userContext: UserContext): Promise<ExploreResponse> => {
    try {
      const prompt = `
        Explain "${query}" to someone with basic understanding, starting from absolute fundamentals.
        
        Guidelines:
        1. Structure:
           - Start with a one-line super simple definition
           - Break down into very small, digestible parts
           - Gradually increase complexity
           - Use lots of real-life examples
           - Explain like you're teaching a complete beginner
        
        2. Language:
           - Use extremely simple words
           - Avoid technical terms initially
           - When using any new term, explain it immediately
           - Use short, clear sentences
           - Include translations/meanings of difficult words
        
        3. Examples:
           - Start with everyday examples
           - Use visual descriptions
           - Connect to common experiences
           - Include "Think of it like..." comparisons
        
        4. Progression:
           - Level 1: Super basic explanation (like explaining to a 5-year-old)
           - Level 2: Slightly more detail with simple examples
           - Level 3: Basic practical applications
           - Level 4: Common misconceptions explained simply
           - Level 5: Slightly more advanced concepts (optional)
        
        5. Format each part as:
           {
             "level": 1-5,
             "content": "explanation text",
             "examples": ["simple example 1", "simple example 2"],
             "simplifiedTerms": {
               "difficult word": "simple meaning"
             }
           }

        6. Related Queries:
           - Include very basic follow-up questions
           - Add "What is..." questions for mentioned terms
           - Suggest simpler sub-topics
           - Include practical application questions

        Return as JSON:
        {
          "parts": [
            {
              "level": number,
              "content": "string",
              "examples": string[],
              "simplifiedTerms": object
            }
          ],
          "relatedQueries": string[]
        }

        Important:
        - Adjust length based on topic complexity
        - Break complex ideas into multiple simple parts
        - Use repetition for important points
        - Include more examples for complex topics
        - Keep language extremely simple
      `;

      const response = await api.post('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a patient teacher who explains complex topics in the simplest possible way, using basic language and lots of examples.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      let content = response.data.choices[0].message.content;
      const parsedContent = cleanAndParseJSON(content);

      // Process and enhance the response
      const enhancedParts = parsedContent.parts.map((part: any) => ({
        ...part,
        content: part.content
          .replace(/\b(\w{7,})\b/g, (match: string) => {
            // Add simple explanations for long words
            if (!part.simplifiedTerms[match]) {
              part.simplifiedTerms[match] = `(in simple words: ${match})`;
            }
            return `${match} ${part.simplifiedTerms[match]}`;
          }),
        examples: part.examples.map((ex: string) => 
          `For example: ${ex}`
        )
      }));

      // Add difficulty indicators
      const relatedQueries = parsedContent.relatedQueries.map((query: string) => 
        `${query} (easy to understand)`
      ).slice(0, 5);

      return {
        parts: enhancedParts.map((part: any) => 
          `${part.content}\n\n${part.examples.join('\n')}`
        ),
        relatedQueries
      };

    } catch (error) {
      console.error('Explore API Error:', error);
      return {
        parts: ['Let me explain this in a simpler way...'],
        relatedQueries: ['Try asking about basics first']
      };
    }
  },

  async getQuestion(topic: string, level: number, userContext: UserContext): Promise<Question> {
    try {
      const question = await gptService.getPlaygroundQuestion(topic, level);
      return question;
    } catch (error) {
      console.error('Question generation error:', error);
      throw new Error('Failed to generate question. Please try again.');
    }
  },

  generateTest: async (topic: string, examType: 'JEE' | 'NEET', userContext: UserContext): Promise<Question[]> => {
    try {
      const prompt = `
        Create 20 multiple choice questions about ${topic} matching real ${examType} exam standards.
        
        Requirements:
        - Questions must match ${examType} exam difficulty level
        - Include numerical problems where applicable
        - Mix of concept-based and calculation-based questions
        - Follow ${examType} exam pattern strictly
        - Include detailed step-by-step solutions
        ${examType === 'JEE' ? `
        - Match JEE Main/Advanced question patterns
        - Include calculation-based problems with JEE complexity
        - Use standard JEE numerical ranges and precision
        ` : `
        - Follow NEET biology/physics/chemistry patterns
        - Include NEET-style clinical/practical applications
        - Match NEET's conceptual depth and reasoning
        `}

        Return the response as a JSON array of questions. Each question must follow this exact format:
        {
          "text": "complete question text",
          "options": ["option1", "option2", "option3", "option4"],
          "correctAnswer": 0,
          "explanation": "detailed solution"
        }

        Important:
        - Return ONLY a valid JSON array of questions
        - No markdown or additional text
        - Each question must have exactly 4 options
        - correctAnswer must be 0-3 (index of correct option)
      `;

      const response = await api.post('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a test generator that creates exam questions matching real JEE/NEET standards. Return only valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      const content = response.data.choices[0].message.content;
      
      // Clean the response
      const cleaned = content
        .replace(/```json\n?|\n?```/g, '')
        .replace(/^\s*\{\s*"questions"\s*:\s*/, '')
        .replace(/\}\s*$/, '')
        .trim();

      let questions = JSON.parse(cleaned);

      // Handle both array and object with questions property
      if (!Array.isArray(questions) && questions.questions) {
        questions = questions.questions;
      }

      if (!Array.isArray(questions)) {
        throw new Error('Invalid response format');
      }

      return questions.map((q: any) => ({
        text: String(q.text || '').trim(),
        options: Array.isArray(q.options) && q.options.length === 4 
          ? q.options.map(String)
          : ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: Number.isInteger(q.correctAnswer) && q.correctAnswer >= 0 && q.correctAnswer < 4
          ? q.correctAnswer 
          : 0,
        explanation: String(q.explanation || '').trim()
      }));

    } catch (error) {
      console.error('Test Generation Error:', error);
      throw error; // Let the component handle the error
    }
  },
};

// Helper functions
function getAgeGroup(age: number): string {
  if (age <= 10) return 'Elementary';
  if (age <= 13) return 'Middle School';
  if (age <= 16) return 'High School';
  return 'Advanced';
}

function generateQuestionId(topic: string, level: number, age: number): string {
  return `${topic}-${level}-${age}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Example age-specific prompts for different topics
const topicAgePrompts: Record<string, Record<string, string>> = {
  'probability': {
    'Elementary': 'Use examples with colored marbles, dice, or simple card games',
    'Middle School': 'Include scenarios with sports statistics or weather predictions',
    'High School': 'Incorporate compound events and conditional probability',
    'Advanced': 'Include complex probability scenarios and theoretical concepts'
  },
  'algebra': {
    'Elementary': 'Focus on basic equations with one unknown',
    'Middle School': 'Include word problems with practical applications',
    'High School': 'Incorporate multiple variables and systems of equations',
    'Advanced': 'Include complex functions and abstract concepts'
  }
  // Add more topics as needed
};

// Helper function to safely get random item
function getRandomItem<T>(array: T[]): T | undefined {
  if (!array || array.length === 0) {
    return undefined;
  }
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to select a unique element from an array
function selectUniqueElement<T>(array: T[], usedSet: Set<T>): T {
  const unusedElements = array.filter(item => !usedSet.has(item));
  if (unusedElements.length === 0) {
    usedSet.clear(); // Reset if all elements have been used
    return array[Math.floor(Math.random() * array.length)];
  }
  const selected = unusedElements[Math.floor(Math.random() * unusedElements.length)];
  usedSet.add(selected);
  return selected;
}

// Helper function to update history
function updateHistory(
  history: QuestionHistory,
  elements: {
    context: string;
    concept: string;
    application: string;
    example: string;
  }
) {
  // Keep track of last N elements for each category
  const maxHistorySize = 10;
  
  history.usedContexts.add(elements.context);
  history.usedConcepts.add(elements.concept);
  history.usedApplications.add(elements.application);
  history.usedExamples.add(elements.example);

  // Clear history if too many items
  if (history.usedContexts.size > maxHistorySize) history.usedContexts.clear();
  if (history.usedConcepts.size > maxHistorySize) history.usedConcepts.clear();
  if (history.usedApplications.size > maxHistorySize) history.usedApplications.clear();
  if (history.usedExamples.size > maxHistorySize) history.usedExamples.clear();
}

function getDefaultTopicContext(topic: string): TopicContext {
  // Generate generic contexts for any topic
  return {
    contexts: [
      'Daily life situations',
      'School scenarios',
      'Hobby activities',
      'Family events',
      'Social situations'
    ],
    concepts: [
      'Basic understanding',
      'Problem solving',
      'Critical thinking',
      'Pattern recognition',
      'Application'
    ],
    realWorldApplications: [
      'Personal decisions',
      'School activities',
      'Family planning',
      'Social interactions',
      'Future planning'
    ],
    difficulty: {
      'Elementary': ['Simple examples', 'Basic scenarios', 'Everyday situations'],
      'Middle School': ['Intermediate problems', 'Real-life applications', 'Multi-step scenarios'],
      'High School': ['Complex situations', 'Abstract thinking', 'Analytical problems'],
      'Advanced': ['Expert level', 'Theoretical applications', 'Research scenarios']
    }
  };
}

// Error handling middleware
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Handle specific API errors
      console.error('API Error:', error.response.data);
      throw new Error(error.response.data.message || 'An error occurred with the API');
    }
    throw error;
  }
);

// Helper functions for age-appropriate content
function getAdjustedLevel(baseLevel: number, history: QuestionHistory, age: number): number {
  const ageBonus = Math.max(0, (age - 10) / 2); // Age factor
  const strengthBonus = history.topicStrength * 2; // Mastery factor
  const streakBonus = Math.min(2, history.consecutiveCorrect * 0.2); // Performance factor
  
  return Math.min(10, Math.max(1, 
    baseLevel + ageBonus + strengthBonus + streakBonus
  ));
}

function getAgeSpecificFocus(age: number, level: number): string {
  if (age <= 12) {
    return `
      - Basic concepts and definitions
      - Simple, real-world examples
      - Visual or tangible scenarios
      - Step-by-step problem solving
    `;
  } else if (age <= 15) {
    return `
      - Core concepts with some complexity
      - Real-world applications
      - Multi-step problem solving
      - Logical reasoning
    `;
  } else {
    return `
      - Advanced concepts
      - Complex problem solving
      - Abstract thinking
      - Theoretical applications
    `;
  }
}

function getDifficultyGuideForLevel(level: number, topicStrength: number): string {
  switch (level) {
    case 1:
      return `
        - Focus on basic definitions and concepts
        - Use simple, straightforward language
        - Test fundamental understanding
        - Include obvious correct answers
        - Avoid complex scenarios
      `;
    case 2:
      return `
        - Introduce basic problem-solving
        - Use slightly more technical terms
        - Test application of basic concepts
        - Include some basic calculations
        - Keep scenarios relatively simple
      `;
    case 3:
      return `
        - Combine multiple basic concepts
        - Include moderate problem-solving
        - Test deeper understanding
        - Use more complex scenarios
        - Require some analytical thinking
      `;
    case 4:
      return `
        - Test application of multiple concepts
        - Include challenging problem-solving
        - Require strong understanding
        - Use complex scenarios
        - Include subtle distinctions
      `;
    default:
      return `
        - Test advanced understanding
        - Include complex problem-solving
        - Combine multiple advanced concepts
        - Use sophisticated scenarios
        - Require deep analytical thinking
      `;
  }
}

// Add age-specific topic contexts
const getTopicAgeContext = (topic: string, age: number): TopicContext => {
  const normalizedTopic = normalizeTopicName(topic);
  const baseContext = topicContexts[normalizedTopic];
  
  if (!baseContext) {
    console.log(`No specific context found for topic: "${topic}" (normalized: "${normalizedTopic}"), using default`);
    return getDefaultTopicContext(normalizedTopic);
  }

  try {
    // Filter contexts based on age appropriateness
    return {
      ...baseContext,
      contexts: baseContext.contexts.filter(context => isContextAppropriate(context, age)),
      concepts: baseContext.concepts.filter(concept => isConceptAppropriate(concept, age)),
      realWorldApplications: baseContext.realWorldApplications.filter(app => isApplicationAppropriate(app, age))
    };
  } catch (error) {
    console.error('Error in getTopicAgeContext:', error);
    return getDefaultTopicContext(normalizedTopic);
  }
};

function isContextAppropriate(context: string, age: number): boolean {
  // Add logic to filter contexts based on age
  const complexContexts = ['Stock market', 'Scientific research', 'Medical diagnosis'];
  if (age < 15 && complexContexts.some(c => context.toLowerCase().includes(c.toLowerCase()))) {
    return false;
  }
  return true;
}

function isConceptAppropriate(concept: string, age: number): boolean {
  // Add logic to filter concepts based on age
  const advancedConcepts = ['Conditional probability', 'Probability distributions'];
  if (age < 16 && advancedConcepts.some(c => concept.toLowerCase().includes(c.toLowerCase()))) {
    return false;
  }
  return true;
}

function isApplicationAppropriate(application: string, age: number): boolean {
  // Add logic to filter applications based on age
  const complexApplications = ['Insurance calculations', 'Market research'];
  if (age < 15 && complexApplications.some(a => application.toLowerCase().includes(a.toLowerCase()))) {
    return false;
  }
  return true;
}

// Helper function for age-specific requirements
function getAgeSpecificRequirements(age: number, level: number): string {
  if (age <= 12) {
    return `
      - Use simple, clear language
      - Include concrete examples
      - Keep questions straightforward
      - Use familiar scenarios
      - Avoid complex terminology
    `;
  } else if (age <= 15) {
    return `
      - Use moderately complex language
      - Include some abstract concepts
      - Add analytical elements
      - Connect to real-world applications
      - Introduce field-specific terms
    `;
  } else {
    return `
      - Use appropriate technical language
      - Include abstract concepts
      - Add critical thinking elements
      - Present complex scenarios
      - Use advanced terminology
    `;
  }
}

export default api;
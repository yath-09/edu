import { Question, UserContext, ExploreResponse } from '../types';
import OpenAI from 'openai';
  
  export class GPTService {
  private openai: OpenAI;
  
    constructor() {
    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }

  private async makeRequest(systemPrompt: string, userPrompt: string, maxTokens: number = 2000) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: [
          { 
            role: 'system', 
            content: `${systemPrompt} Provide your response in JSON format.` 
          },
          { 
            role: 'user', 
            content: userPrompt 
          }
            ],
            temperature: 0.7,
        max_tokens: maxTokens,
            response_format: { type: "json_object" }
      });

      return response.choices[0].message?.content || '';
      } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate content');
    }
  }

  async getExploreContent(query: string, userContext: UserContext): Promise<ExploreResponse> {
    try {
      const systemPrompt = `You are a Gen-Z tutor who explains complex topics in the simplest possible way.
        First, identify the type of topic:
        - MATH: Include formulas, equations, and mathematical expressions
        - PHYSICS: Include relevant equations and units
        - CHEMISTRY: Include chemical formulas and reactions
        - BIOLOGY: Include diagrams descriptions and processes
        - COMPUTER_SCIENCE: Include code snippets or syntax
        - OTHER: Include key terminology and concepts

        You MUST return a JSON response with EXACTLY this structure:

        {
          "content": "CUSTOMIZE based on topic type:\\n\\n
            First para: Define the concept and its importance. For MATH/PHYSICS/CHEMISTRY, introduce the key formula or equation.\\n\\n
            Second para: Break down the components. For MATH: explain each part of the formula. For PHYSICS: explain variables and units. For CHEMISTRY: explain reactions.\\n\\n
            Third para: Show practical applications with specific examples, including numerical examples where relevant.",
          "relatedTopics": [
            {
              "topic": "1-3 word closely related topic",
              "type": "prerequisite | extension | application | parallel | deeper"
            }
            // exactly 5 topics with these types:
            // prerequisite: fundamental concept needed first (e.g., "Basic Algebra" for Calculus)
            // extension: advanced topic that builds on this (e.g., "Quantum Field Theory" for Quantum Physics)
            // application: real-world use case (e.g., "Neural Networks" for Linear Algebra)
            // parallel: related concept at same level (e.g., "Chemical Bonding" for Atomic Structure)
            // deeper: specific aspect worth exploring (e.g., "Wave-Particle Duality" for Quantum Mechanics)
          ],
          "relatedQuestions": [
            {
              "question": "Keep questions short (8-12 words). Example: 'How do magnets help trains float?'",
              "type": "application | insight | fact | mystery | discovery",
              "context": "Brief hook (10-15 words max)"
            }
            // exactly 5 questions
          ]
        }

        Content guidelines:
        - Each paragraph: 35-50 words
        - MUST have exactly 3 paragraphs
        - For MATH topics:
          * Include relevant formulas with proper notation
          * Explain each variable
          * Show example calculations
        - For PHYSICS topics:
          * Include equations with units
          * Explain physical relationships
          * Show real-world applications
        - For CHEMISTRY topics:
          * Include chemical formulas
          * Show balanced reactions
          * Explain molecular interactions
        - For all topics:
          * Use clear examples
          * Connect to real applications
          * Explain step by step

        Example for Calculus:
        "The derivative (dy/dx) is the rate of change of a function. It tells us how fast something is changing at any point.\\n\\n
        To find a derivative, we use limits: lim[h→0] (f(x+h) - f(x))/h. For example, the derivative of x² is 2x, showing the slope at each point.\\n\\n
        Derivatives help us optimize real problems, like finding maximum profit in business or minimum material costs in engineering."

        Example for Acceleration:
        "Acceleration (a) measures how quickly velocity changes, given by a = Δv/Δt or a = (v₂-v₁)/t. It's measured in meters per second squared (m/s²).\\n\\n
        The formula F = ma connects acceleration to force and mass. When you push a 2kg box with 10N force, it accelerates at 5 m/s².\\n\\n
        We experience acceleration daily: cars speeding up (positive a), braking (negative a), or turning (centripetal a = v²/r)."

        IMPORTANT: 
        - Always include relevant formulas for MATH/PHYSICS/CHEMISTRY
        - Use specific examples with numbers
        - Show practical applications
        - Keep explanations clear and engaging
        - Make topics relatable to real life
        - Use simple, everyday words in questions
        - Avoid technical or complex terms
        - Write questions like you're talking to a friend
        - Make questions easy to understand
        - Use examples from daily life

        Related Questions Format:
        * Keep questions very short (8-12 words)
        * Use simple, everyday words
        * Start with how/what/why when possible
        * Make each question direct and clear
        * Examples of good questions:
          - "How do rockets use this to reach space?"
          - "Why does this happen in cold weather?"
          - "What makes this work in your phone?"
          - "How do doctors use this to save lives?"
          - "Why does this matter in everyday life?"
        * Avoid:
          - Long explanatory phrases
          - Technical terminology
          - Complex sentence structures
          - Multiple questions in one
          - Overly detailed context

        IMPORTANT: 
        - Keep questions short and sweet (max 12 words)
        - Use everyday language
        - Make questions clear and direct
        - Focus on one idea per question
        - Keep context brief and simple

        Related Topics Guidelines:
        * Topics should be 1-3 words maximum
        * Must be closely related to main query
        * Mix of internal and external connections
        * Examples for "Quantum Mechanics":
          - "Wave Mathematics" (prerequisite: math needed for waves)
          - "Quantum Computing" (application: modern use)
          - "String Theory" (extension: advanced concept)
          - "Particle Physics" (parallel: related field)
          - "Quantum Entanglement" (deeper: specific phenomenon)

        * Examples for "Chemical Bonding":
          - "Electron Configuration" (prerequisite)
          - "Molecular Engineering" (extension)
          - "Drug Design" (application)
          - "Atomic Structure" (parallel)
          - "Hydrogen Bonding" (deeper)

        * Ensure each topic:
          - Has clear connection to query
          - Represents natural learning path
          - Offers valuable exploration
          - Makes sense for level
          - Sparks curiosity`;

      const userPrompt = `Explain "${query}" for someone aged ${userContext.age} studying for ${userContext.studyingFor}.
      Make it simple and relatable.
      Return the response in the exact JSON format specified.`;

      const content = await this.makeRequest(systemPrompt, userPrompt);
      console.log('Raw GPT response:', content);
      
      if (!content) {
        throw new Error('Empty response from GPT');
      }

      try {
        const parsedContent = JSON.parse(content);
        console.log('Parsed content:', parsedContent);
        
        if (!parsedContent?.content || typeof parsedContent.content !== 'string') {
          throw new Error('Content is missing or invalid');
        }

        // Clean up and normalize the content
        let cleanContent = parsedContent.content
          .replace(/\r\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        // Split into paragraphs
        let paragraphs = cleanContent.split(/\n\n/).filter((p: string) => p.trim().length > 0);

        // If we don't have exactly 3 paragraphs, try to split by sentences
        if (paragraphs.length !== 3) {
          const sentences = cleanContent.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim());
          const totalSentences = sentences.length;
          
          // Aim for roughly equal distribution of sentences
          const firstBreak = Math.floor(totalSentences / 3);
          const secondBreak = Math.floor((2 * totalSentences) / 3);

          paragraphs = [
            sentences.slice(0, firstBreak).join(' '),
            sentences.slice(firstBreak, secondBreak).join(' '),
            sentences.slice(secondBreak).join(' ')
          ];
        }

        // Log paragraph lengths but don't throw errors
        paragraphs = paragraphs.map((para: string, index: number) => {
          const words = para.trim().split(/\s+/);
          const wordCount = words.length;

          // Log warnings for non-ideal lengths
          if (wordCount < 25) {
            console.warn(`Paragraph ${index + 1} is shorter than ideal (${wordCount} words)`);
          } else if (wordCount > 60) {
            console.warn(`Paragraph ${index + 1} is longer than ideal (${wordCount} words)`);
          }

          // Try to improve very short paragraphs if possible
          if (wordCount < 20 && index < paragraphs.length - 1) {
            // Combine with next paragraph if too short
            const nextPara = paragraphs[index + 1];
            paragraphs[index + 1] = '';
            return `${para} ${nextPara}`.trim();
          }

          // Try to split very long paragraphs
          if (wordCount > 70 && index < paragraphs.length - 1) {
            const mid = Math.ceil(words.length / 2);
            paragraphs[index + 1] = `${words.slice(mid).join(' ')} ${paragraphs[index + 1]}`;
            return words.slice(0, mid).join(' ');
          }

          return para;
        }).filter((p: string) => p.length > 0);

        // Ensure we have content, even if not exactly 3 paragraphs
        if (paragraphs.length === 0) {
          paragraphs = [cleanContent];
        }

        // Update content with formatted paragraphs
        parsedContent.content = paragraphs.join('\n\n');

        // Validate topics and questions
        if (!Array.isArray(parsedContent.relatedTopics) || parsedContent.relatedTopics.length !== 5) {
          throw new Error('Must have exactly 5 related topics');
        }

        if (!Array.isArray(parsedContent.relatedQuestions) || parsedContent.relatedQuestions.length !== 5) {
          throw new Error('Must have exactly 5 related questions');
        }

        // Basic type validation
        const topicTypes = ['prerequisite', 'extension', 'application', 'parallel', 'deeper'];
        const questionTypes = ['application', 'insight', 'fact', 'mystery', 'discovery'];

        parsedContent.relatedTopics.forEach((topic: { topic: string; type: string }, i: number) => {
          if (!topic?.topic || !topic?.type || !topicTypes.includes(topic.type)) {
            console.warn(`Fixing topic type at index ${i}`);
            topic.type = topicTypes[i % topicTypes.length];
          }
        });

        parsedContent.relatedQuestions.forEach((question: { 
          question: string; 
          type: string; 
          context?: string 
        }, i: number) => {
          if (!question?.question || !question?.type || !questionTypes.includes(question.type)) {
            console.warn(`Fixing question type at index ${i}`);
            question.type = questionTypes[i % questionTypes.length];
          }
        });

        return {
          content: parsedContent.content,
          relatedTopics: parsedContent.relatedTopics,
          relatedQuestions: parsedContent.relatedQuestions
        };
      } catch (error) {
        console.error('Parse/validation error:', error);
        throw error;
      }
    } catch (error) {
      console.error('GPT service error:', error);
      throw new Error(`Failed to get content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateQuestionFormat(question: Question): boolean {
    if (!question?.text || typeof question.text !== 'string' || question.text.trim() === '') {
      console.log('Invalid text');
      return false;
    }

    if (!Array.isArray(question.options) || question.options.length !== 4) {
      console.log('Invalid options array');
      return false;
    }

    if (question.options.some((opt: string) => typeof opt !== 'string' || opt.trim() === '')) {
      console.log('Invalid option content');
      return false;
    }

    if (typeof question.correctAnswer !== 'number' || 
        question.correctAnswer < 0 || 
        question.correctAnswer > 3) {
      console.log('Invalid correctAnswer');
      return false;
    }

    if (!question.explanation || typeof question.explanation !== 'string') {
      console.log('Invalid explanation');
      return false;
    }

    return true;
  }

  async getPlaygroundQuestion(topic: string, level: number, userContext: UserContext): Promise<Question> {
    try {
      let attempts = 0;
      const maxAttempts = 3;
      const maxTokens = 1000; // Reduced token limit for faster response

      while (attempts < maxAttempts) {
        try {
          console.log(`Generating question attempt ${attempts + 1}`);
          const content = await this.makeRequest(
            this.getQuestionPrompt(topic, level, userContext),
            `Create one multiple choice question about "${topic}"`,
            maxTokens
          );

          const parsedContent = JSON.parse(content);
          console.log('Parsed content:', parsedContent);

          if (this.validateQuestionFormat(parsedContent)) {
            return parsedContent;
          }

          console.warn(`Invalid format, attempt ${attempts + 1} of ${maxAttempts}`);
        } catch (error) {
          console.error(`Error in attempt ${attempts + 1}:`, error);
        }
        
        attempts++;
      }

      throw new Error('Failed to generate valid question after multiple attempts');
    } catch (error) {
      console.error('Question generation error:', error);
      throw error;
    }
  }

  private getQuestionPrompt(topic: string, level: number, userContext: UserContext): string {
    return `You are an expert educator creating unique, engaging multiple-choice questions.
      Target audience: ${userContext.age} year old student
      Topic: "${topic}"
      Difficulty level: ${level}/10

      QUESTION REQUIREMENTS:
      1. Create a unique, engaging question that:
         - Is perfectly tailored for a ${userContext.age}-year-old's cognitive level
         - Introduces new concepts or problem-solving approaches
         - Covers aspects of ${topic} in an interesting way
         - Uses real-world scenarios when possible
         - Avoids repetitive formats

      2. Difficulty Guidelines:
         - Make it slightly challenging but definitely solvable
         - Match difficulty level ${level}/10
         - Consider age-appropriate complexity
         - Include thought-provoking elements
         - Keep it engaging and interesting

      3. Answer Choices:
         - Create four well-randomized, diverse options
         - Make wrong choices reasonable but clearly incorrect
         - Avoid obviously wrong options
         - Keep options distinct from each other
         - Randomize correct answer placement

      4. Question Styles (mix these up):
         - Direct conceptual questions
         - Scenario-based problems
         - Real-world applications
         - Fill-in-the-blank format
         - Cause-and-effect relationships
         - Compare-and-contrast setups

      STRICT JSON FORMAT:
      {
        "text": "Your unique, engaging question here?",
        "options": [
          "Well-crafted first option",
          "Thoughtful second option",
          "Reasonable third option",
          "Plausible fourth option"
        ],
        "correctAnswer": "MUST be a number 0-3, randomly placed",
        "explanation": "Detailed, insightful explanation that:
          - Clearly explains why the correct answer is right
          - Addresses why other options are wrong
          - Provides additional learning value
          - Uses clear, age-appropriate language
          - Connects to real-world understanding",
        "difficulty": ${level},
        "topic": "${topic}",
        "subtopic": "specific aspect being tested",
        "questionType": "direct | scenario | application | analysis",
        "ageGroup": "${userContext.age}"
      }

      CRITICAL RULES:
      1. Question Quality:
         - Must be fresh and unique
         - Should be engaging and informative
         - Must be age-appropriate
         - Should encourage critical thinking
         - Must be clearly worded

      2. Answer Format:
         - correctAnswer must be number 0-3
         - All options must be unique
         - No obviously wrong choices
         - Randomize answer placement
         - Keep options balanced in length

      3. Explanation Quality:
         - Must be clear and insightful
         - Should teach even if wrong
         - Include relevant examples
         - Connect to real life
         - Use simple language

      Remember:
      - Make each question feel fresh and new
      - Keep difficulty appropriate for age ${userContext.age}
      - Ensure educational value
      - Use clear, engaging language
      - Make it interesting and fun to learn`;
    }
  
    async getTestQuestions(topic: string, examType: 'JEE' | 'NEET'): Promise<Question[]> {
    try {
      const systemPrompt = `Create a ${examType} exam test set about ${topic}.
        Generate exactly 15 questions following this structure:
        {
          "questions": [
            {
              "text": "Clear question text",
              "options": ["A", "B", "C", "D"],
              "correctAnswer": 0,
              "explanation": "Step-by-step solution",
              "difficulty": 1,
              "topic": "${topic}",
              "subtopic": "specific concept",
              "examType": "${examType}",
              "questionType": "conceptual"
            }
          ]
        }`;

      console.log('Generating test questions...');
      
      const content = await this.makeRequest(
        systemPrompt,
        `Create 15 ${examType} questions about ${topic} (5 easy, 5 medium, 5 hard)`,
        3000
      );

      console.log('Received response from API');

      if (!content) {
        console.error('Empty response from API');
        throw new Error('No content received from API');
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
        console.log('Successfully parsed JSON response');
      } catch (error) {
        console.error('JSON parse error:', error);
        console.log('Raw content:', content);
        throw new Error('Failed to parse API response');
      }

      if (!parsed?.questions || !Array.isArray(parsed.questions)) {
        console.error('Invalid response structure:', parsed);
        throw new Error('Invalid response structure');
      }

      console.log(`Received ${parsed.questions.length} questions`);

      const processedQuestions = parsed.questions.map((q: Partial<Question>, index: number) => {
        const difficulty = Math.floor(index / 5) + 1;
        return {
          text: q.text || '',
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: q.explanation || '',
          difficulty,
          topic,
          subtopic: q.subtopic || `${topic} Concept ${index + 1}`,
          examType,
          questionType: 'conceptual',
          ageGroup: '16-18'
        } as Question;
      });

      console.log('Processed questions:', processedQuestions.length);

      const validQuestions = processedQuestions.filter((q: Question) => {
        const isValid = this.validateQuestionFormat(q);
        if (!isValid) {
          console.log('Invalid question:', q);
        }
        return isValid;
      });

      console.log(`Valid questions: ${validQuestions.length}`);

      if (validQuestions.length >= 5) {
        const finalQuestions = validQuestions.slice(0, 15);
        console.log(`Returning ${finalQuestions.length} questions`);
        return finalQuestions;
      }

      throw new Error(`Only ${validQuestions.length} valid questions generated`);
    } catch (error) {
      console.error('Test generation error:', error);
      throw new Error(`Failed to generate test questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exploreQuery(query: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system' as const,
            content: 'You are a social media trend expert who explains topics by connecting them to current viral trends, memes, and pop culture moments.'
          },
          {
            role: 'user' as const,
            content: this.buildPrompt(query)
          }
        ],
        temperature: 0.9,
        max_tokens: 4000
      });

      return response.choices[0].message?.content || '';
    } catch (error) {
      console.error('Error in exploreQuery:', error);
      return 'bestie, the wifi must be acting up... let me try again';
    }
  }

  // Helper method to build the prompt
  private buildPrompt(query: string): string {
    return `
      Explain "${query}" using current social media trends, memes, and pop culture references.
      
      Content Style Guide:
      1. Social Media Format Mix:
         - Start with a TikTok-style hook ("POV: you're learning ${query}")
         - Add Instagram carousel-style bullet points
         - Use Twitter/X thread style for facts
         - Include YouTube shorts-style quick explanations
         - End with a viral trend reference
      
      2. Current Trends to Use:
         - Reference viral TikTok sounds/trends
         - Use current meme formats
         - Mention trending shows/movies
         - Reference popular games
         - Include viral challenges
         - Use trending audio references
      
      3. Make it Relatable With:
         - Instagram vs Reality comparisons
         - "That one friend who..." examples
         - "Nobody: / Me:" format
         - "Real ones know..." references
         - "Living rent free in my head" examples
         - "Core memory" references
      
      4. Structure it Like:
         - 🎭 The Hook (TikTok style intro)
         - 📱 The Breakdown (Instagram carousel style)
         - 🧵 The Tea (Twitter thread style facts)
         - 🎬 Quick Takes (YouTube shorts style)
         - 🌟 The Trend Connection (viral reference)
      
      5. Format as:
         {
           "part": {
             "style": "tiktok/insta/twitter/youtube/trend",
             "content": "explanation using current trend",
             "trendReference": "name of trend being referenced",
             "viralComparisons": ["relatable comparison 1", "relatable comparison 2"],
             "popCultureLinks": {
               "trend or term": "how it relates to the topic"
             }
           }
         }

      6. Related Content Style:
         - "Trending topics to explore..."
         - "This gives... vibes"
         - "Main character moments in..."
         - "POV: when you learn about..."

      Important:
      - Use CURRENT trends (2024)
      - Reference viral moments
      - Make pop culture connections
      - Use platform-specific formats
      - Keep updating references
    `;
    }
  }
  
  export const gptService = new GPTService();
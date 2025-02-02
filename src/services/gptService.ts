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
        First, identify the domain of the topic from these categories:
        - SCIENCE: Physics, Chemistry, Biology, Environmental Science
        - MATHEMATICS: Algebra, Calculus, Geometry, Statistics
        - TECHNOLOGY: Computer Science, AI, Robotics, Digital Tech
        - MEDICAL: Anatomy, Physiology, Healthcare, Medicine
        - HISTORY: World History, Civilizations, Cultural Studies
        - BUSINESS: Economics, Finance, Management, Marketing
        - LAW: Legal Systems, Rights, Regulations
        - PSYCHOLOGY: Human Behavior, Mental Processes, Development
        - CURRENT_AFFAIRS: Global Events, Politics, Social Issues
        - GENERAL: Any other topic or interdisciplinary queries

        Return your response in this EXACT JSON format:
        {
          "domain": "one of the domains listed above",
          "content": {
            "paragraph1": "Core concept explanation with key principles (50-75 words)",
            "paragraph2": "Detailed breakdown with examples specific to '${query}' (50-75 words)",
            "paragraph3": "Real-world applications and relevance of '${query}' (50-75 words)"
          },
          "relatedTopics": [
            {
              "topic": "A foundational concept directly needed to understand '${query}'",
              "type": "prerequisite"
            },
            {
              "topic": "An advanced concept that builds upon '${query}'",
              "type": "extension"
            },
            {
              "topic": "A practical real-world application of '${query}'",
              "type": "application"
            },
            {
              "topic": "A related concept at the same level as '${query}'",
              "type": "parallel"
            },
            {
              "topic": "A specific aspect of '${query}' worth exploring",
              "type": "deeper"
            }
          ],
          "relatedQuestions": [
            {
              "question": "How is '${query}' used in everyday life?",
              "type": "application",
              "context": "Real-world relevance"
            },
            {
              "question": "Why is '${query}' important in [domain]?",
              "type": "insight",
              "context": "Understanding significance"
            },
            {
              "question": "What are the key components of '${query}'?",
              "type": "fact",
              "context": "Core elements"
            },
            {
              "question": "How does '${query}' relate to [related field]?",
              "type": "mystery",
              "context": "Interdisciplinary connections"
            },
            {
              "question": "What's the future potential of '${query}'?",
              "type": "discovery",
              "context": "Future implications"
            }
          ]
        }

        IMPORTANT:
        - All topics and questions must be DIRECTLY related to '${query}'
        - Use specific examples and terminology from the query's domain
        - Make connections that are clear and logical
        - Ensure each related topic builds clear knowledge progression
        - Questions should explore different aspects of the main topic`;

      const userPrompt = `Explain "${query}" for someone aged ${userContext.age}.
        Follow the exact JSON format and domain-specific paragraph structure.`;

      const content = await this.makeRequest(systemPrompt, userPrompt);
      console.log('Raw GPT response:', content);
      
      if (!content) {
        throw new Error('Empty response from GPT');
      }

      const parsedContent = JSON.parse(content);
      console.log('Parsed content:', parsedContent);

      // Validate the response structure
      if (!parsedContent.domain || !parsedContent.content || 
          !parsedContent.content.paragraph1 || 
          !parsedContent.content.paragraph2 || 
          !parsedContent.content.paragraph3) {
        throw new Error('Invalid response structure');
      }

      // Combine paragraphs into content
      const formattedContent = [
        parsedContent.content.paragraph1,
        parsedContent.content.paragraph2,
        parsedContent.content.paragraph3
      ].join('\n\n');

      // Ensure related topics and questions exist
      const relatedTopics = Array.isArray(parsedContent.relatedTopics) 
        ? parsedContent.relatedTopics.slice(0, 5) 
        : [];

      const relatedQuestions = Array.isArray(parsedContent.relatedQuestions)
        ? parsedContent.relatedQuestions.slice(0, 5)
        : [];

      return {
        content: formattedContent,
        relatedTopics: relatedTopics,
        relatedQuestions: relatedQuestions
      };

    } catch (error) {
      console.error('Explore content error:', error);
      throw new Error('Failed to generate explore content');
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
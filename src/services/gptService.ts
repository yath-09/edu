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
      You MUST return a JSON response with EXACTLY this structure - no additional fields or modifications:

      {
        "parts": [
          "string content for introduction and basic concept (at least 150 words)",
          "string content for main explanation with relatable examples (at least 200 words)",
          "string content for real-world applications and summary (at least 150 words)"
        ],
        "relatedQueries": [
          {
            "query": "EXAMPLE: If main topic is 'Quantum Physics', then write 'Wave-Particle Duality'",
            "type": "prerequisite",
            "context": "EXAMPLE: 'POV: You just found out everything you touch is actually 99.9% empty space 🤯'"
          },
          {
            "query": "EXAMPLE: If topic is 'Python Programming', then write 'Object-Oriented Programming'",
            "type": "extension",
            "context": "EXAMPLE: 'The coding secret that made Minecraft possible... and why it's breaking the internet'"
          },
          {
            "query": "EXAMPLE: If topic is 'Chemical Bonding', then write 'Drug Design Chemistry'",
            "type": "application",
            "context": "EXAMPLE: 'They said this molecule was impossible to make... until this happened'"
          },
          {
            "query": "EXAMPLE: If topic is 'Natural Selection', then write 'AI Evolution'",
            "type": "parallel",
            "context": "EXAMPLE: 'Wait till you see how AI is literally copying nature's 4-billion-year cheat code'"
          },
          {
            "query": "EXAMPLE: If topic is 'Gravity', then write 'Black Holes'",
            "type": "deeper",
            "context": "EXAMPLE: 'The universe's biggest mystery that even Einstein couldn't solve... until now'"
          }
        ]
      }

      Content guidelines:
      - Each main content part should be detailed and comprehensive (minimum 150-200 words each)
      - For related queries:
        * 'query' must be an ACTUAL TOPIC NAME, not a description
        * 'context' must be a viral-style hook that creates suspense or curiosity
        * Keep contexts short and punchy (10-15 words)
        * Make each hook unique and topic-specific:
          - Create unexpected connections to daily life
          - Use current trends and viral content styles
          - Make surprising revelations about the topic
          - Connect to things people already know
          - Challenge common assumptions
          - Reveal hidden aspects of the topic
          - Use humor and unexpected comparisons
          - Create "wait, what?" moments
          - Make complex ideas sound intriguing
          - Use conversational, Gen-Z style language

        * Examples of good hooks (for inspiration only, create your own):
          "Your favorite game mechanic was actually invented by accident"
          "The math equation that predicted TikTok would go viral"
          "When nature copied a video game design (yes, really)"
          "This simple trick powers every phone on the planet"
          "A coding mistake that became a billion-dollar feature"

      DO NOT modify the JSON structure. Keep exactly 5 related queries with the exact types shown.
      IMPORTANT: Create unique, topic-specific hooks. Don't follow any fixed patterns. Let each hook naturally fit its topic.`;

      const userPrompt = `Explain "${query}" for someone aged ${userContext.age} studying for ${userContext.studyingFor}.
      Make it simple and relatable.
      Return the response in the exact JSON format specified.`;

      const content = await this.makeRequest(systemPrompt, userPrompt);
      
      try {
        const parsedContent = JSON.parse(content);
        
        // Basic structure validation
        if (!parsedContent || typeof parsedContent !== 'object') {
          throw new Error('Response is not a valid JSON object');
        }

        if (!Array.isArray(parsedContent.parts) || parsedContent.parts.length === 0) {
          throw new Error('Parts array is missing or empty');
        }

        if (!Array.isArray(parsedContent.relatedQueries) || parsedContent.relatedQueries.length !== 5) {
          throw new Error('RelatedQueries must be an array with exactly 5 items');
        }

        // Add type annotation for the parameter
        if (!parsedContent.parts.every((p: unknown) => typeof p === 'string' && p.trim().length > 0)) {
          throw new Error('All parts must be non-empty strings');
        }

        // Validate related queries
        const requiredTypes = ['prerequisite', 'extension', 'application', 'parallel', 'deeper'];
        
        for (const [index, query] of parsedContent.relatedQueries.entries()) {
          if (!query || typeof query !== 'object') {
            throw new Error(`Invalid query object at index ${index}`);
          }
          
          if (typeof query.query !== 'string' || query.query.trim().length === 0) {
            throw new Error(`Invalid query string at index ${index}`);
          }
          
          if (!requiredTypes.includes(query.type)) {
            throw new Error(`Invalid query type at index ${index}: ${query.type}`);
          }
          
          if (typeof query.context !== 'string' || query.context.trim().length === 0) {
            throw new Error(`Invalid context at index ${index}`);
          }
        }

        // Verify all required types are present exactly once
        const types = parsedContent.relatedQueries.map((q: { type: string }) => q.type);
        const uniqueTypes = new Set(types);
        if (uniqueTypes.size !== requiredTypes.length) {
          throw new Error('Each query type must appear exactly once');
        }

        return parsedContent as ExploreResponse;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Invalid response format: ${error.message}`);
        }
        throw new Error('Invalid response format');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Explore content error:', error.message);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  async getPlaygroundQuestion(topic: string, level: number, userContext: UserContext): Promise<Question> {
    const systemPrompt = `You are an expert educator who creates engaging questions. 
      Create questions suitable for a ${userContext.age} year old student studying for ${userContext.studyingFor}.
      Return a JSON object with the following structure:
      {
        "text": "question text",
        "options": ["option1", "option2", "option3", "option4"],
        "correctAnswer": 0,
        "explanation": "explanation text",
        "difficulty": 5,
        "topic": "topic name",
        "subtopic": "subtopic name",
        "ageGroup": "age group"
      }`;
    
    const userPrompt = `Create a multiple choice question about "${topic}" at difficulty level ${level}/10.`;

    try {
      const content = await this.makeRequest(systemPrompt, userPrompt);
      const parsedContent = JSON.parse(content);
      
      // Validate the response structure
      if (!parsedContent.text || !Array.isArray(parsedContent.options)) {
        console.error('Invalid question format:', parsedContent);
        throw new Error('Invalid question format received');
      }
      
      return parsedContent;
    } catch (error) {
      console.error('Question generation error:', error);
      throw error;
    }
  }

  async getTestQuestions(topic: string, examType: 'JEE' | 'NEET'): Promise<Question[]> {
    const systemPrompt = `You are a test generator for ${examType} exams. Return a JSON object with EXACTLY 20 multiple choice questions in the following format:
    {
      "questions": [
        {
          "text": "question text",
          "options": ["option1", "option2", "option3", "option4"],
          "correctAnswer": 0,
          "explanation": "explanation text",
          "difficulty": 5,
          "topic": "${topic}",
          "subtopic": "subtopic name",
          "ageGroup": "High School"
        }
        // ... 19 more questions
      ]
    }
    IMPORTANT: Generate EXACTLY 20 questions, no more, no less.`;
    
    const userPrompt = `Create 20 multiple choice questions about "${topic}" suitable for ${examType} exam. 
      Ensure questions cover different aspects and difficulty levels.
      Make sure to return EXACTLY 20 questions.
      Questions should be challenging and exam-standard.`;

    try {
      console.log('GPT service making request with:', { topic, examType });
      const content = await this.makeRequest(systemPrompt, userPrompt, 4000); // Increased max tokens
      const parsed = JSON.parse(content);
      
      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length !== 20) {
        console.error('Invalid test format or wrong number of questions:', parsed);
        throw new Error(`Invalid test format received. Expected 20 questions, got ${parsed.questions?.length || 0}`);
      }
      
      console.log('GPT service received response:', parsed.questions);
      return parsed.questions;
    } catch (error) {
      console.error('Test generation error:', error);
      throw error;
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
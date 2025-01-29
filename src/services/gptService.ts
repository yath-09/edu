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
            "query": "Basic Prerequisite Topic",
            "type": "prerequisite",
            "context": "[Make a surprising connection to daily life about this specific prerequisite]"
          },
          {
            "query": "Next Level Topic",
            "type": "extension",
            "context": "[Tease an unexpected application or mind-blowing fact about this specific topic]"
          },
          {
            "query": "Real World Application",
            "type": "application",
            "context": "[Share an exciting real-world use that most people don't know about]"
          },
          {
            "query": "Similar Concept",
            "type": "parallel",
            "context": "[Point out a surprising similarity with something totally unexpected]"
          },
          {
            "query": "Advanced Topic",
            "type": "deeper",
            "context": "[Hook with a fascinating mystery or unsolved question in this area]"
          }
        ]
      }

      Content guidelines:
      - Each main content part should be detailed and comprehensive (minimum 150-200 words each)
      - Make related queries specific to the main topic being discussed
      - Create unique, topic-specific hooks for each context (15-20 words)
      - Context should reveal something surprising or intriguing about that specific topic
      - Use extremely simple English and Gen-Z language
      - Reference social media and pop culture
      - Make it engaging without emojis
      - Keep it casual and conversational
      - Each context should make readers curious about that specific subtopic
      
      DO NOT modify the JSON structure. Keep exactly 5 related queries with the exact types shown.
      Each related query should be a proper topic with a concise, engaging one-liner context.`;

      const userPrompt = `Explain "${query}" for someone aged ${userContext.age} studying for ${userContext.studyingFor}.
      Make it simple and relatable.
      Return the response in the exact JSON format specified.`;

      const content = await this.makeRequest(systemPrompt, userPrompt);
      
      try {
        const parsedContent = JSON.parse(content);
        
        // Log for debugging
        console.log('Raw GPT Response:', content);
        console.log('Parsed GPT Response:', parsedContent);

        // Basic structure validation
        if (!parsedContent?.parts || !Array.isArray(parsedContent.parts)) {
          console.error('Invalid parts structure:', parsedContent);
          throw new Error('Parts array is missing or invalid');
        }

        if (!parsedContent?.relatedQueries || !Array.isArray(parsedContent.relatedQueries)) {
          console.error('Invalid relatedQueries structure:', parsedContent);
          throw new Error('RelatedQueries array is missing or invalid');
        }

        // Validate parts content
        if (parsedContent.parts.length === 0 || 
            !parsedContent.parts.every(p => typeof p === 'string' && p.trim().length > 0)) {
          throw new Error('Parts must be non-empty strings');
        }

        // Validate related queries
        const requiredTypes = ['prerequisite', 'extension', 'application', 'parallel', 'deeper'];
        
        if (parsedContent.relatedQueries.length !== 5) {
          throw new Error(`Expected 5 related queries, got ${parsedContent.relatedQueries.length}`);
        }

        // Validate each query
        parsedContent.relatedQueries.forEach((query, index) => {
          if (!query?.query || typeof query.query !== 'string' || query.query.trim().length === 0) {
            throw new Error(`Invalid query string at index ${index}`);
          }
          if (!query?.type || !requiredTypes.includes(query.type)) {
            throw new Error(`Invalid query type at index ${index}: ${query.type}`);
          }
          if (!query?.context || typeof query.context !== 'string' || query.context.trim().length === 0) {
            throw new Error(`Invalid context at index ${index}`);
          }
        });

        // Check for all required types
        const types = parsedContent.relatedQueries.map(q => q.type);
        const missingTypes = requiredTypes.filter(type => !types.includes(type));
        if (missingTypes.length > 0) {
          throw new Error(`Missing required query types: ${missingTypes.join(', ')}`);
        }

        return parsedContent as ExploreResponse;
      } catch (parseError) {
        console.error('Parse Error:', parseError);
        console.error('Raw Content:', content);
        throw new Error(`Invalid response format: ${parseError.message}`);
      }
    } catch (error) {
      console.error('Explore content error:', error);
      throw error;
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
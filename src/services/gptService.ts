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
    const systemPrompt = `You are a social media trend expert who explains topics by connecting them to current viral trends, memes, and pop culture moments. Return a JSON response with:
    {
      "parts": [
        "Part 1 content with social media style explanation",
        "Part 2 content with different platform style",
        "Part 3 content with another style",
        "Part 4 content if needed",
        "Part 5 content if needed"
      ],
      "relatedQueries": [
        {
          "query": "related topic 1",
          "type": "prerequisite",
          "context": "why this is important to know first"
        },
        {
          "query": "related topic 2",
          "type": "extension",
          "context": "explore this to go deeper"
        },
        {
          "query": "related topic 3",
          "type": "application",
          "context": "real-world application of this concept"
        },
        {
          "query": "related topic 4",
          "type": "parallel",
          "context": "similar concept in different field"
        },
        {
          "query": "related topic 5",
          "type": "deeper",
          "context": "advanced aspect of this topic"
        }
      ]
    }`;

    const userPrompt = `Explain "${query}" for someone aged ${userContext.age} using:
    1. TikTok-style hook and trendy intro
    2. Instagram carousel-style bullet points
    3. Twitter/X thread style facts
    4. YouTube shorts-style quick explanations
    5. End with viral trend references

    Use current social media trends, memes, and pop culture references.
    Make it relatable with:
    - "That one friend who..." examples
    - "Nobody: / Me:" format
    - "Real ones know..." references
    - "Core memory" references
    - Platform-specific formats
    - Current viral moments (2024)
    - Trending shows/movies/games references
    
    Include 5 related topics with their relationships (prerequisite/extension/application/parallel/deeper).`;

    try {
      const content = await this.makeRequest(systemPrompt, userPrompt);
      const response = JSON.parse(content);
      
      if (!Array.isArray(response.parts) || !Array.isArray(response.relatedQueries)) {
        console.error('Invalid explore response format:', response);
        throw new Error('Invalid response format');
      }
      
      return response;
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
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

  private async makeRequest(systemPrompt: string, userPrompt: string) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      return response.choices[0].message?.content || '';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate content');
    }
  }

  async getExploreContent(query: string, userContext: UserContext): Promise<ExploreResponse> {
    const systemPrompt = `You are an expert educator who explains topics in an engaging way.`;
    const userPrompt = `Explain "${query}" for someone aged ${userContext.age}.`;

    try {
      const content = await this.makeRequest(systemPrompt, userPrompt);
      return JSON.parse(content);
    } catch (error) {
      console.error('Explore content error:', error);
      throw error;
    }
  }

  async getPlaygroundQuestion(topic: string, level: number): Promise<Question> {
    const systemPrompt = `You are an expert educator who creates engaging questions.`;
    const userPrompt = `Create a question about "${topic}" at level ${level}.`;

    try {
      const content = await this.makeRequest(systemPrompt, userPrompt);
      return JSON.parse(content);
    } catch (error) {
      console.error('Question generation error:', error);
      throw error;
    }
  }

  async getTestQuestions(topic: string, examType: 'JEE' | 'NEET'): Promise<Question[]> {
    const systemPrompt = `You are a test generator for ${examType} exams.`;
    const userPrompt = `Create questions about "${topic}".`;

    try {
      const content = await this.makeRequest(systemPrompt, userPrompt);
      const parsed = JSON.parse(content);
      return parsed.questions || [];
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
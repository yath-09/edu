interface UserInfo {
    age?: number;
    location?: string;
    studyingFor?: string;
  }
  
  interface RelatedTopic {
    query: string;
    type: 'prerequisite' | 'extension' | 'application' | 'parallel' | 'deeper';
    context: string;
  }
  
  interface ExploreResponse {
    parts: string[];
    relatedQueries: RelatedTopic[];
    context?: string;
  }
  
  interface Question {
    text: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }
  
  export class GPTService {
    private apiKey: string;
    private baseUrl: string;
  
    constructor() {
      this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      this.baseUrl = 'https://api.openai.com/v1';
    }
  
    private async makeRequest(systemPrompt: string, userPrompt: string) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { 
                role: 'system', 
                content: `${systemPrompt} Return response in JSON format.` 
              },
              { 
                role: 'user', 
                content: `${userPrompt} Ensure the response is in valid JSON format.` 
              }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
        }
  
        const data = await response.json();
        return data.choices[0].message.content;
      } catch (error) {
        console.error('Request failed:', error);
        throw error;
      }
    }
  
    async getExploreContent(query: string, userInfo: UserInfo, previousContext?: string): Promise<ExploreResponse> {
      const systemPrompt = `You are a social media-obsessed Gen Z expert who explains topics by connecting them to viral trends, memes, and relatable social media moments. Return response in JSON format.`;
  
      const userPrompt = `${previousContext ? 'Provide more advanced details about' : 'Explain'} "${query}" for someone who spends way too much time on social media.
      
      Return the response in the following JSON format:
      {
        "parts": [
          {
            "title": "[create a catchy, Gen Z style title for this section]",
            "content": "[explanation with social media references]",
            "trendReference": "[current viral reference that explains this]",
            "viralComparisons": ["relatable social media comparison"]
          }
        ],
        "relatedQueries": [
          {
            "query": "Prerequisite Topic Name",
            "type": "prerequisite",
            "context": "Brief explanation of this foundational concept"
          },
          {
            "query": "Extension Topic Name",
            "type": "extension",
            "context": "Brief explanation of this advanced concept"
          },
          {
            "query": "Application Topic Name",
            "type": "application",
            "context": "Brief explanation of this practical use"
          },
          {
            "query": "Parallel Topic Name",
            "type": "parallel",
            "context": "Brief explanation of this related concept"
          },
          {
            "query": "Deeper Topic Name",
            "type": "deeper",
            "context": "Brief explanation of this specialized aspect"
          }
        ]
      }

      Important Guidelines:
      - Create 4 distinct sections that progressively build understanding
      - First section should introduce the basic concept
      - Include practical applications in later sections
      - Make section titles creative and relevant to the topic
      - Use emojis in titles when appropriate
      - Titles should reflect the content's vibe
      - Each section should have a different focus/angle
      - Keep the Gen Z style consistent throughout
      - Make titles catchy but informative
      - Adapt title style to match the topic

      For related topics (not questions):
      1. Prerequisites: Fundamental concepts needed to understand this topic
         Example: For "Quantum Mechanics" → "Wave Functions"
      2. Extensions: Advanced concepts that build on this topic
         Example: For "Newton's Laws" → "Lagrangian Mechanics"
      3. Applications: Real-world uses of this concept
         Example: For "Thermodynamics" → "Heat Engines"
      4. Parallel Concepts: Related topics in the same field
         Example: For "Cell Biology" → "Molecular Genetics"
      5. Deeper Dives: More specialized aspects of this topic
         Example: For "Chemical Bonding" → "Molecular Orbital Theory"

      Make each related topic highly specific and directly connected to the main topic.`;
  
      try {
        const content = await this.makeRequest(systemPrompt, userPrompt);
        const parsedContent = JSON.parse(content);
  
        const enhancedParts = parsedContent.parts.map((part: any, index: number) => {
          const baseContent = `${part.title}\n${part.content}\n\n` +
            `${part.trendReference ? `✨ Trending parallel: ${part.trendReference}\n` : ''}` +
            `${part.viralComparisons.map(comp => `💫 Think of it like: ${comp}`).join('\n')}`;
  
          // Add "Know More" indicator only if there's more content available
          return part.hasMoreContent && index === parsedContent.parts.length - 1
            ? `${baseContent}\n\n[KNOW_MORE_BUTTON]`
            : baseContent;
        });
  
        return {
          parts: enhancedParts,
          relatedQueries: parsedContent.relatedQueries,
          context: parsedContent.context
        };
  
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    }
  
    async getPlaygroundQuestion(topic: string, level: number, userContext: any): Promise<Question> {
      try {
        const ageGroup = userContext?.age ? getAgeGroup(userContext.age) : 'High School';
        const topicContext = getTopicAgeContext(topic, userContext?.age || 16);

        const systemPrompt = `You are an expert educator who creates engaging, age-appropriate practice questions.`;

        const userPrompt = `
          Create a multiple-choice question about "${topic}" for a ${ageGroup} student.
          
          Level: ${level}/10
          Age Group: ${ageGroup}
          Topic: ${topic}

          Requirements:
          - Match difficulty level ${level} out of 10
          - Use age-appropriate language and examples
          - Include real-world applications when possible
          - Make it engaging and relevant
          - Ensure clear, unambiguous correct answer
          - Provide detailed explanation
          
          Use these topic-specific contexts:
          - Contexts: ${topicContext.contexts.join(', ')}
          - Concepts: ${topicContext.concepts.join(', ')}
          - Applications: ${topicContext.realWorldApplications.join(', ')}
          - Age-specific examples: ${topicContext.difficulty[ageGroup].join(', ')}

          Return as JSON:
          {
            "text": "question text",
            "options": ["option1", "option2", "option3", "option4"],
            "correctAnswer": 0,
            "explanation": "detailed explanation"
          }
        `;

        const content = await this.makeRequest(systemPrompt, userPrompt);
        const parsedContent = JSON.parse(content);

        // Validate the response format
        if (!parsedContent.text || !Array.isArray(parsedContent.options) || 
            parsedContent.options.length !== 4 || typeof parsedContent.correctAnswer !== 'number' ||
            !parsedContent.explanation) {
          throw new Error('Invalid question format received from API');
        }

        return {
          text: parsedContent.text,
          options: parsedContent.options,
          correctAnswer: parsedContent.correctAnswer,
          explanation: parsedContent.explanation
        };
      } catch (error) {
        console.error('Question generation error:', error);
        throw new Error('Failed to generate question. Please try again.');
      }
    }
  
    async getTestQuestions(topic: string, examType: 'JEE' | 'NEET'): Promise<Question[]> {
      const prompt = `
        Create 20 multiple-choice questions about ${topic} at ${examType} level.
        Format as JSON array with objects containing "text", "options" array, "correctAnswer" index.
      `;
  
      const response = await this.makeRequest(prompt, '');
      return JSON.parse(response);
    }
  }
  
  export const gptService = new GPTService();

export const exploreQuery = async (query: string): Promise<string> => {
  const prompt = `
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

  const messages = [
    {
      role: 'system',
      content: 'You are a social media trend expert who explains topics by connecting them to current viral trends, memes, and pop culture moments.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.9,
      max_tokens: 4000
    });

    const content = response.data.choices[0].message?.content || '';
    const parsedContent = JSON.parse(content);

    // Process and enhance with trend references
    const enhancedParts = parsedContent.parts.map((part: any) => ({
      ...part,
      content: `
        ${part.style === 'tiktok' ? '🎵 Trending Sound 🎵\n' : ''}
        ${part.content}
        
        ${part.trendReference ? `✨ As seen on: ${part.trendReference}` : ''}
      `,
      viralComparisons: part.viralComparisons.map((comp: string) => 
        `💫 ${comp} (iykyk)`
      ),
      popCultureLinks: Object.entries(part.popCultureLinks)
        .map(([trend, relation]) => `🔥 ${trend}: ${relation}`)
    }));

    // Format with social media style
    const formattedContent = enhancedParts
      .map((part: any) => {
        const styleEmojis: { [key: string]: string } = {
          tiktok: '📱',
          insta: '📸',
          twitter: '🐦',
          youtube: '🎥',
          trend: '⭐'
        };

        return `
          ${styleEmojis[part.style] || '✨'} ${part.content}
          
          ${part.viralComparisons.join('\n')}
          
          ${part.popCultureLinks.join('\n')}
        `.trim();
      })
      .join('\n\n');

    return `
      POV: you're about to understand ${query} in the most viral way possible ✨
      
      ${formattedContent}
      
      no bc why is this so accurate? 💅
      
      trending rn: 
      ${parsedContent.relatedQueries.map((q: string) => `🎯 ${q} era`).join('\n')}
      
      #${query.replace(/\s+/g, '')} #learning #fyp #viral
    `;

  } catch (error) {
    console.error('Error in exploreQuery:', error);
    return 'bestie, the wifi must be acting up... let me try again';
  }
};

// Add these helper functions at the top of the file
function getAgeGroup(age: number): string {
  if (age <= 10) return 'Elementary';
  if (age <= 13) return 'Middle School';
  if (age <= 16) return 'High School';
  return 'Advanced';
}

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

function getTopicAgeContext(topic: string, age: number): TopicContext {
  // Default context structure
  return {
    contexts: [
      'Daily life situations',
      'School scenarios',
      'Sports and games',
      'Social media examples',
      'Entertainment'
    ],
    concepts: [
      'Basic principles',
      'Core concepts',
      'Problem solving',
      'Real-world connections',
      'Practical applications'
    ],
    realWorldApplications: [
      'Everyday situations',
      'School activities',
      'Games and sports',
      'Technology use',
      'Social interactions'
    ],
    difficulty: {
      'Elementary': [
        'Simple examples',
        'Basic scenarios',
        'Visual explanations',
        'Familiar situations'
      ],
      'Middle School': [
        'Intermediate examples',
        'Real-life applications',
        'Practical scenarios',
        'Relatable contexts'
      ],
      'High School': [
        'Advanced concepts',
        'Complex scenarios',
        'Abstract thinking',
        'Detailed analysis'
      ],
      'Advanced': [
        'Expert level',
        'Theoretical applications',
        'Complex problems',
        'In-depth analysis'
      ]
    }
  };
}
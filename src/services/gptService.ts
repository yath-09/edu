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
        model: 'gpt-3.5-turbo',
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
      const systemPrompt = `You are a Gen-Z tutor who explains complex topics concisely considering you are teaching someone with a low IQ.
        First, identify the domain of the topic from these categories:
        - SCIENCE: Physics, Chemistry, Biology
        - MATHEMATICS: Algebra, Calculus, Geometry
        - TECHNOLOGY: Computer Science, AI, Robotics
        - MEDICAL: Anatomy, Healthcare, Medicine
        - HISTORY: World History, Civilizations
        - BUSINESS: Economics, Finance, Marketing
        - LAW: Legal Systems, Rights
        - PSYCHOLOGY: Human Behavior, Development
        - CURRENT_AFFAIRS: Global Events, Politics
        - GENERAL: Any other topic

        Return your response in this EXACT JSON format:
        {
          "domain": "identified domain",
          "content": {
            "paragraph1": "Core concept in around 20-30 words - clear, simple, story-telling based introduction and definition",
            "paragraph2": "talk more detail about it in around 20-30 words - main ideas and examples",
            "paragraph3": "Real world applications in around 20-40 words - practical uses and relevance"
          },
          "relatedTopics": [
            {
              "topic": "Most fundamental prerequisite concept",
              "type": "prerequisite",
              "reason": "Brief explanation of why this is essential to understand first"
            },
            {
              "topic": "Most exciting advanced application",
              "type": "extension",
              "reason": "Why this advanced topic is fascinating"
            },
            {
              "topic": "Most impactful real-world use",
              "type": "application",
              "reason": "How this changes everyday life"
            },
            {
              "topic": "Most interesting related concept",
              "type": "parallel",
              "reason": "What makes this connection intriguing"
            },
            {
              "topic": "Most thought-provoking aspect",
              "type": "deeper",
              "reason": "Why this specific aspect is mind-bending"
            }
          ],
          "relatedQuestions": [
            {
              "question": "What if...? (speculative question)",
              "type": "curiosity",
              "context": "Thought-provoking scenario"
            },
            {
              "question": "How exactly...? (mechanism question)",
              "type": "mechanism",
              "context": "Fascinating process to understand"
            },
            {
              "question": "Why does...? (causality question)",
              "type": "causality",
              "context": "Surprising cause-effect relationship"
            },
            {
              "question": "Can we...? (possibility question)",
              "type": "innovation",
              "context": "Exciting potential development"
            },
            {
              "question": "What's the connection between...? (insight question)",
              "type": "insight",
              "context": "Unexpected relationship"
            }
          ]
        }

        IMPORTANT RULES:
        - Each paragraph MUST be around 20-30 words
        - Use simple, clear language
        - Focus on key information only
        - No repetition between paragraphs
        - Make every word count
        - Keep examples specific and brief

        SUBTOPIC GUIDELINES:
        - Focus on the most fascinating aspects
        - Highlight unexpected connections
        - Show real-world relevance
        - Include cutting-edge developments
        - Connect to current trends
        - Emphasize "wow factor"

        QUESTION GUIDELINES:
        - Start with curiosity triggers: "What if", "How exactly", "Why does", "Can we"
        - Focus on mind-bending aspects
        - Highlight counterintuitive elements
        - Explore edge cases
        - Connect to emerging trends
        - Challenge assumptions
        - Spark imagination
        - Make reader think "I never thought about that!"`;

      const userPrompt = `Explain "${query}" in approximately three 20-30 word paragraphs:
        1. Basic definition without using words like imagine
        2. more details
        3. Real-world application examples without using the word real world application
        Make it engaging for someone aged ${userContext.age}.`;

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
    try {
      // Basic validation
      if (!question.text?.trim()) return false;
      if (!Array.isArray(question.options) || question.options.length !== 4) return false;
      if (question.options.some(opt => !opt?.trim())) return false;
      if (typeof question.correctAnswer !== 'number' || 
          question.correctAnswer < 0 || 
          question.correctAnswer > 3) return false;

      // Explanation validation
      if (!question.explanation?.correct?.trim() || 
          !question.explanation?.key_point?.trim()) return false;

      // Additional validation
      if (question.text.length < 10) return false;  // Too short
      if (question.options.length !== new Set(question.options).size) return false; // Duplicates
      if (question.explanation.correct.length < 5 || 
          question.explanation.key_point.length < 5) return false; // Too short explanations

      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  async getPlaygroundQuestion(topic: string, level: number, userContext: UserContext): Promise<Question> {
    try {
      const aspects = [
        'core_concepts',
        'applications',
        'problem_solving',
        'analysis',
        'current_trends'
      ];

      // Randomly select an aspect to focus on
      const selectedAspect = aspects[Math.floor(Math.random() * aspects.length)];
      
      const systemPrompt = `Generate a UNIQUE multiple-choice question about ${topic}.
        Focus on: ${selectedAspect.replace('_', ' ')}

        Return in this JSON format:
        {
          "text": "question text here",
          "options": ["option A", "option B", "option C", "option D"],
          "correctAnswer": RANDOMLY_PICKED_NUMBER_0_TO_3,
          "explanation": {
            "correct": "Brief explanation of why the correct answer is right (max 15 words)",
            "key_point": "One key concept to remember (max 10 words)"
          },
          "difficulty": ${level},
          "topic": "${topic}",
          "subtopic": "specific subtopic",
          "questionType": "conceptual",
          "ageGroup": "${userContext.age}"
        }

        IMPORTANT RULES FOR UNIQUENESS:
        1. For ${topic}, based on selected aspect:
           - core_concepts: Focus on fundamental principles and theories
           - applications: Focus on real-world use cases and implementations
           - problem_solving: Present a scenario that needs solution
           - analysis: Compare different approaches or technologies
           - current_trends: Focus on recent developments and future directions

        2. Question Variety:
           - NEVER use the same question pattern twice
           - Mix theoretical and practical aspects
           - Include industry-specific examples
           - Use different question formats (what/why/how/compare)
           - Incorporate current developments in ${topic}

        3. Answer Choices:
           - Make ALL options equally plausible
           - Randomly assign the correct answer (0-3)
           - Ensure options are distinct but related
           - Include common misconceptions
           - Make wrong options educational

        4. Format Requirements:
           - Question must be detailed and specific
           - Each option must be substantive
           - Explanation must cover why correct answer is right AND why others are wrong
           - Include real-world context where possible
           - Use age-appropriate language

        ENSURE HIGH ENTROPY:
        - Randomize question patterns
        - Vary difficulty within level ${level}
        - Mix theoretical and practical aspects
        - Use different companies/technologies as examples
        - Include various ${topic} scenarios

        EXPLANATION GUIDELINES:
        - Keep explanations extremely concise and clear
        - Focus on the most important point only
        - Use simple language
        - Highlight the key concept
        - No redundant information
        - Maximum 25 words total`;

      const userPrompt = `Create a completely unique ${level}/10 difficulty question about ${topic}.
        Focus on ${selectedAspect.replace('_', ' ')}.
        Ensure the correct answer is randomly placed.
        Make it engaging for a ${userContext.age} year old student.
        Use current examples and trends.`;

      const content = await this.makeRequest(systemPrompt, userPrompt, 1500);
      
      if (!content) {
        throw new Error('Empty response received');
      }

      let parsedContent: Question;
      try {
        parsedContent = JSON.parse(content);
      } catch (error) {
        console.error('JSON Parse Error:', error);
        throw new Error('Invalid JSON response');
      }

      // Randomly shuffle the options and adjust correctAnswer accordingly
      const shuffled = this.shuffleOptionsAndAnswer(parsedContent);

      // Validate and format the question
      const formattedQuestion: Question = {
        text: shuffled.text || '',
        options: shuffled.options,
        correctAnswer: shuffled.correctAnswer,
        explanation: {
          correct: shuffled.explanation?.correct || 'Correct answer explanation',
          key_point: shuffled.explanation?.key_point || 'Key learning point'
        },
        difficulty: level,
        topic: topic,
        subtopic: parsedContent.subtopic || topic,
        questionType: 'conceptual',
        ageGroup: userContext.age.toString()
      };

      if (this.validateQuestionFormat(formattedQuestion)) {
        return formattedQuestion;
      }

      throw new Error('Generated question failed validation');
    } catch (error) {
      console.error('Question generation error:', error);
      throw new Error('Failed to generate valid question');
    }
  }

  private shuffleOptionsAndAnswer(question: Question): Question {
    // Create array of option objects with original index
    const optionsWithIndex = question.options.map((opt, idx) => ({
      text: opt,
      isCorrect: idx === question.correctAnswer
    }));

    // Shuffle the options
    for (let i = optionsWithIndex.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
    }

    // Find new index of correct answer
    const newCorrectAnswer = optionsWithIndex.findIndex(opt => opt.isCorrect);

    return {
      ...question,
      options: optionsWithIndex.map(opt => opt.text),
      correctAnswer: newCorrectAnswer
    };
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
        // ..
        

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
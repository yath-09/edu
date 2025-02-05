import OpenAI from 'openai';
import { OpenAIStream } from 'ai';
import { StreamingTextResponse } from 'ai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Set runtime to edge for better performance
export const runtime = 'edge';

export default async function POST(req: Request) {
  try {
    const { query, userContext } = await req.json();

    const systemPrompt = `You are a Gen-Z tutor who explains complex topics concisely for a ${userContext.age} year old.
      First provide the explanation in plain text, then provide related content in a STRICT single-line JSON format.
      
      Structure your response exactly like this:
      
      <paragraph 1>

      <paragraph 2>

      <paragraph 3>

      ---
      {"topics":[{"name":"Topic","type":"prerequisite","detail":"Why"}],"questions":[{"text":"Q?","type":"curiosity","detail":"Context"}]}

      RULES:
      - ADAPT CONTENT FOR ${userContext.age} YEAR OLD:
        * Match complexity of explanation to age level
        
      - STRICT LENGTH LIMITS:
        * Total explanation must be 60-80 words maximum
        * Each paragraph around 20-25 words each
        * Related questions maximum 12 words each
        * Topic details 1-2 words each
      - Keep paragraphs clear and simple
      - Third paragraph should directly state applications and facts without phrases like "In real-world applications"
      - Use "---" as separator
      - JSON must be in a single line
      - No line breaks in JSON
      - MUST provide EXACTLY 5 related topics and 5 questions
      - Related questions must be:
        * Curiosity-driven and thought-provoking
        * STRICTLY 8-12 words maximum
        * Focus on mind-blowing facts or surprising connections
        * Make users think "Wow, I never thought about that!"
      - Related topics must be:
        * Directly relevant to understanding the main topic
        * Mix of prerequisites and advanced concepts
        * Brief, clear explanation of importance
      - Topic types: prerequisite, extension, application, parallel, deeper
      - Question types: curiosity, mechanism, causality, innovation, insight`;

    const userPrompt = `Explain "${query}" in three very concise paragraphs for a ${userContext.age} year old in genz style:
      1. Basic definition (15-20 words)
      2. Key details (15-20 words)
      3. Direct applications and facts (15-20 words)

      Then provide EXACTLY:
      - 5 related topics that help understand ${query} better (age-appropriate)
      - 5 mind-blowing questions (8-12 words each) that spark curiosity
      
      Follow the format and length limits strictly.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    // Create a stream from the OpenAI response
    const stream = OpenAIStream(response);

    // Return a streaming response
    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
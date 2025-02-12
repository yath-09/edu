export interface StreamChunk {
    text: string;
    topics: any[];
    questions: any[];
}
  
  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  
  export async function streamExploreContent(
    query: string,
    userContext: { age: number },
    onChunk: (chunk: StreamChunk) => void
  ) {
    try {
      const response = await fetch(`${API_URL}/api/gpt/explore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, userContext }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch AI response');
      }
  
      const data: StreamChunk = await response.json();
      onChunk(data);
    } catch (error) {
      console.error('Error fetching AI response:', error);
    }
  }
  
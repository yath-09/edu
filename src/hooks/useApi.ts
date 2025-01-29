// src/hooks/useApi.ts
import { useState } from 'react';
import { gptApi } from '../services/api';

export const useApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  const cleanAndParseJSON = (jsonString: string): any[] => {
    try {
      // First, normalize the string
      let cleanJson = jsonString
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .trim();

      // Extract just the array part
      const startIdx = cleanJson.indexOf('[');
      const endIdx = cleanJson.lastIndexOf(']');
      if (startIdx === -1 || endIdx === -1) {
        throw new Error('Invalid JSON array format');
      }
      cleanJson = cleanJson.slice(startIdx, endIdx + 1);

      // Fix the JSON structure
      const fixedJson = cleanJson
        // Remove all parentheses and their content from property names
        .replace(/"\([^"]+\)":/g, function(match) {
          return match.replace(/[()]/g, '');
        })
        // Remove parentheses from values
        .replace(/"[^"]*"/g, function(match) {
          return match.replace(/[()]/g, '');
        })
        // Remove any remaining parentheses
        .replace(/[()]/g, '')
        // Fix common JSON issues
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/\s+/g, ' ')
        // Ensure property names are quoted
        .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

      const parsed = JSON.parse(fixedJson);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Parsed result is not an array');
      }

      return parsed;
    } catch (error) {
      console.error('JSON Parse Error:', error);
      console.error('Original JSON:', jsonString);
      throw new Error(`Failed to parse questions: ${error.message}`);
    }
  };

  const makeApiCall = async (prompt: string) => {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (err) {
      console.error('API Call Error:', err);
      throw new Error('Failed to generate questions');
    }
  };

  const generateTest = async (topic: string, examType: 'JEE' | 'NEET', userContext: any) => {
    setIsLoading(true);
    try {
      return await gptApi.generateTest(topic, examType, userContext);
    } catch (err) {
      console.error('Test Generation Error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const explore = async (query: string, userContext: any) => {
    setIsLoading(true);
    try {
      return await gptApi.explore(query, userContext);
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getQuestion = async (topic: string, level: number, userContext: any) => {
    setIsLoading(true);
    try {
      // Make sure we're using the gptApi.getQuestion
      const question = await gptApi.getQuestion(topic, level, userContext);
      return question;
    } catch (err) {
      console.error('Question API Error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    explore,
    getQuestion,
    generateTest
  };
};
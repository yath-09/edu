// src/services/api.ts
import { Question, UserContext, ExploreResponse } from '../types';
import { GPTService } from './gptService';

const gptService = new GPTService();

const transformQuestion = (rawQuestion: any): Question => ({
  text: rawQuestion.text,
  options: rawQuestion.options,
  correctAnswer: rawQuestion.correctAnswer,
  explanation: rawQuestion.explanation,
  difficulty: rawQuestion.difficulty || 5,
  ageGroup: rawQuestion.ageGroup || 'High School',
  topic: rawQuestion.topic || '',
  subtopic: rawQuestion.subtopic || ''
});

export const api = {
  async getQuestion(topic: string, level: number, userContext: UserContext): Promise<Question> {
    try {
      const question = await gptService.getPlaygroundQuestion(topic, level);
      return transformQuestion(question);
    } catch (error) {
      console.error('Question generation error:', error);
      throw new Error('Failed to generate question');
    }
  },

  async explore(query: string, userContext: UserContext): Promise<ExploreResponse> {
    try {
      const response = await gptService.getExploreContent(query, userContext);
      return response;
    } catch (error) {
      console.error('Explore error:', error);
      throw new Error('Failed to explore topic');
    }
  },

  async generateTest(topic: string, examType: 'JEE' | 'NEET'): Promise<Question[]> {
    try {
      const questions = await gptService.getTestQuestions(topic, examType);
      return questions.map(transformQuestion);
    } catch (error) {
      console.error('Test generation error:', error);
      throw new Error('Failed to generate test');
    }
  }
};
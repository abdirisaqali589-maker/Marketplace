import { z } from 'zod';

export const createQuestionSchema = z.object({
  question: z.string().min(3).max(1000),
});

export const answerQuestionSchema = z.object({
  answer: z.string().min(1).max(2000),
});

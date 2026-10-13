import { z } from 'zod';

export const messagePayload = z.object({
  requestId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(5).max(4000),
  website: z.string().max(200).optional().default(''),
}).strict();

export type InboxMessage = {
  id: string;
  email: string;
  message: string;
  source: string;
  status: 'new' | 'done';
  createdAt: number;
};

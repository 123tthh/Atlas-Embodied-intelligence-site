import {z} from 'zod';

export const reviewPolicy = {cadenceDays: 7, weekday: 'Tuesday', time: '10:00', timezone: 'Asia/Shanghai', instructions: '/api/updates/instructions'} as const;
const source = z.object({url: z.string().url().max(2048).refine(v => v.startsWith('https://')), supports: z.string().trim().min(20).max(1200)}).strict();
export const reviewDecision = z.object({
  action: z.literal('review'), runId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
  kind: z.enum(['proposal', 'message']), id: z.string().uuid(),
  snapshot: z.string().regex(/^[a-f0-9]{64}$/),
  decision: z.enum(['approved', 'rejected', 'deferred']),
  note: z.string().trim().min(10).max(1000), checks: z.array(source).max(8),
  publishedPaperId: z.string().max(100).optional(),
}).strict().superRefine((v, ctx) => {
  if (v.decision === 'approved' && !v.checks.length) ctx.addIssue({code: 'custom', message: 'Approval requires primary-source checks'});
  if (v.kind === 'message' && v.decision === 'approved' && !v.publishedPaperId) ctx.addIssue({code: 'custom', message: 'A message can be accepted only after its verified paper is published'});
  if (v.kind === 'proposal' && v.publishedPaperId) ctx.addIssue({code: 'custom', message: 'Proposals publish through their reviewed record'});
});

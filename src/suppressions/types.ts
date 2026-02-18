import { z } from 'zod';

export const SuppressionRuleSchema = z.object({
  /** Exact skill name to match */
  skill: z.string().min(1),
  /** Glob patterns to match against finding location path */
  paths: z.array(z.string().min(1)).min(1),
  /** Optional substring match against finding title */
  title: z.string().optional(),
  /** Human-readable justification for the suppression */
  reason: z.string().min(1),
});
export type SuppressionRule = z.infer<typeof SuppressionRuleSchema>;

export const SuppressionFileSchema = z.object({
  suppressions: z.array(SuppressionRuleSchema).default([]),
});
export type SuppressionFile = z.infer<typeof SuppressionFileSchema>;

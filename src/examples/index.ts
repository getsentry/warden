/**
 * @deprecated Use src/evals/ instead. This module is retained only for backwards
 * compatibility. The eval infrastructure has moved to src/evals/ with YAML-based
 * specs and LLM-as-a-judge verification.
 *
 * See evals/README.md for the new eval system.
 */
export { discoverEvals as discoverExamples } from '../evals/index.js';
export { discoverEvalFiles as discoverExampleFiles } from '../evals/index.js';
export { loadEvalFile as loadExampleFile } from '../evals/index.js';
export { EvalFileSchema as ExampleMetaSchema } from '../evals/types.js';
export type { EvalMeta as ExampleMeta } from '../evals/types.js';
export type { ShouldFind as ExpectedFinding } from '../evals/types.js';

/**
 * Ink-based skill runner with real-time progress display.
 *
 * ## Ink Rendering Constraints
 *
 * This file uses Ink (React for CLIs) which has specific constraints that,
 * if violated, cause duplicate output lines or corrupted display:
 *
 * 1. **Single Static component**: Ink's Static uses `position: 'absolute'`.
 *    Multiple Static components cause layout conflicts. We print the header
 *    before Ink starts to avoid needing a second Static.
 *
 * 2. **Stable item references**: Static tracks items by reference equality.
 *    Never wrap items in new objects (e.g., `{ type: 'skill', skill }`) on
 *    each render. Pass the original objects directly.
 *
 * 3. **Batched updates**: Rapid consecutive rerender() calls cause duplicate
 *    output. The updateUI() function batches updates using setImmediate().
 *
 * 4. **No direct writes to stderr**: Writing to process.stderr while Ink is
 *    running corrupts cursor tracking. The onLargePrompt/onPromptSize callbacks
 *    are exceptions that may cause minor display glitches in edge cases.
 */
import { type SkillTaskOptions, type SkillTaskResult, type RunTasksOptions } from './tasks.js';
/**
 * Run skill tasks with Ink-based real-time progress display.
 */
export declare function runSkillTasksWithInk(tasks: SkillTaskOptions[], options: RunTasksOptions): Promise<SkillTaskResult[]>;
//# sourceMappingURL=ink-runner.d.ts.map
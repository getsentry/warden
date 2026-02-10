import type { Reporter } from '../output/reporter.js';
import type { CLIOptions } from '../args.js';
/**
 * Run the sync command.
 * Updates cached remote skills to their latest versions.
 * Pinned skills (with @sha) are skipped as they're immutable.
 */
export declare function runSync(options: CLIOptions, reporter: Reporter): Promise<number>;
//# sourceMappingURL=sync.d.ts.map
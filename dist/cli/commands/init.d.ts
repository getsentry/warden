import type { Reporter } from '../output/reporter.js';
import type { CLIOptions } from '../args.js';
export interface InitOptions {
    force: boolean;
}
/**
 * Run the init command to scaffold warden configuration.
 */
export declare function runInit(options: CLIOptions, reporter: Reporter): Promise<number>;
//# sourceMappingURL=init.d.ts.map
/**
 * Setup GitHub App command.
 * Creates a GitHub App via the manifest flow for Warden to post as a custom bot.
 */
import type { SetupAppOptions } from '../args.js';
import type { Reporter } from '../output/reporter.js';
/**
 * Run the setup-app command.
 */
export declare function runSetupApp(options: SetupAppOptions, reporter: Reporter): Promise<number>;
//# sourceMappingURL=setup-app.d.ts.map
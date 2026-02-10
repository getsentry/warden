import type { EventContext } from '../types/index.js';
import { type HunkWithContext } from '../diff/index.js';
import type { PreparedFile, PrepareFilesOptions, PrepareFilesResult } from './types.js';
/**
 * Group hunks by filename into PreparedFile entries.
 */
export declare function groupHunksByFile(hunks: HunkWithContext[]): PreparedFile[];
/**
 * Prepare files for analysis by parsing patches into hunks with context.
 * Returns files that have changes to analyze and files that were skipped.
 */
export declare function prepareFiles(context: EventContext, options?: PrepareFilesOptions): PrepareFilesResult;
//# sourceMappingURL=prepare.d.ts.map
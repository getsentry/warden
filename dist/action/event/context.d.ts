import type { Octokit } from '@octokit/rest';
import { type EventContext } from '../types/index.js';
export declare class EventContextError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
export declare function buildEventContext(eventName: string, eventPayload: unknown, repoPath: string, octokit: Octokit): Promise<EventContext>;
//# sourceMappingURL=context.d.ts.map
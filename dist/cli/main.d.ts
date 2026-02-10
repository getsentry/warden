/**
 * Global abort controller for graceful shutdown on SIGINT.
 * Used to cancel in-progress SDK queries.
 */
export declare const abortController: AbortController;
/**
 * Track whether SIGINT was received so the main flow can
 * render partial results and exit with code 130.
 */
export declare const interrupted: {
    value: boolean;
};
export declare function main(): Promise<void>;
//# sourceMappingURL=main.d.ts.map
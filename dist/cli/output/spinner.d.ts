import type { OutputMode } from './tty.js';
import { Verbosity } from './verbosity.js';
/**
 * TTY-aware spinner wrapper.
 * Falls back to simple logging in non-TTY mode.
 */
export declare class Spinner {
    private spinner;
    private currentText;
    private readonly mode;
    private readonly verbosity;
    constructor(mode: OutputMode, verbosity: Verbosity);
    /**
     * Start a new spinner with the given text.
     */
    start(text: string): void;
    /**
     * Update the spinner text.
     */
    update(text: string): void;
    /**
     * Mark the spinner as successful and stop it.
     */
    succeed(text?: string): void;
    /**
     * Mark the spinner as failed and stop it.
     */
    fail(text?: string): void;
    /**
     * Mark the spinner as warned and stop it.
     */
    warn(text?: string): void;
    /**
     * Stop the spinner without a status change.
     */
    stop(): void;
    /**
     * Check if spinner is currently running.
     */
    isSpinning(): boolean;
}
//# sourceMappingURL=spinner.d.ts.map
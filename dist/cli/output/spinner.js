import ora from 'ora';
import { Verbosity } from './verbosity.js';
import { timestamp } from './tty.js';
/**
 * TTY-aware spinner wrapper.
 * Falls back to simple logging in non-TTY mode.
 */
export class Spinner {
    spinner = null;
    currentText = '';
    mode;
    verbosity;
    constructor(mode, verbosity) {
        this.mode = mode;
        this.verbosity = verbosity;
    }
    /**
     * Start a new spinner with the given text.
     */
    start(text) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        this.currentText = text;
        if (this.mode.isTTY) {
            this.spinner = ora({
                text,
                spinner: 'dots',
                color: 'cyan',
            }).start();
        }
        else {
            // Non-TTY: print with timestamp
            console.error(`[${timestamp()}] warden: ${text}`);
        }
    }
    /**
     * Update the spinner text.
     */
    update(text) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        this.currentText = text;
        if (this.spinner) {
            this.spinner.text = text;
        }
        // In non-TTY mode, don't log updates to avoid spam
    }
    /**
     * Mark the spinner as successful and stop it.
     */
    succeed(text) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        const finalText = text ?? this.currentText;
        if (this.spinner) {
            this.spinner.succeed(finalText);
            this.spinner = null;
        }
        else if (!this.mode.isTTY) {
            // Non-TTY: log completion
            console.error(`[${timestamp()}] warden: ${finalText}`);
        }
    }
    /**
     * Mark the spinner as failed and stop it.
     */
    fail(text) {
        const finalText = text ?? this.currentText;
        if (this.spinner) {
            this.spinner.fail(finalText);
            this.spinner = null;
        }
        else {
            // Always log failures, even in quiet mode
            console.error(`[${timestamp()}] warden: ERROR: ${finalText}`);
        }
    }
    /**
     * Mark the spinner as warned and stop it.
     */
    warn(text) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        const finalText = text ?? this.currentText;
        if (this.spinner) {
            this.spinner.warn(finalText);
            this.spinner = null;
        }
        else if (!this.mode.isTTY) {
            console.error(`[${timestamp()}] warden: WARN: ${finalText}`);
        }
    }
    /**
     * Stop the spinner without a status change.
     */
    stop() {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = null;
        }
    }
    /**
     * Check if spinner is currently running.
     */
    isSpinning() {
        return this.spinner?.isSpinning ?? false;
    }
}
//# sourceMappingURL=spinner.js.map
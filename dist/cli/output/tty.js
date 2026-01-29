import chalk from 'chalk';
/**
 * Detect terminal capabilities.
 * @param colorOverride - Optional override for color support (--color / --no-color)
 */
export function detectOutputMode(colorOverride) {
    // Check both stderr and stdout for TTY - some environments have TTY on one but not the other
    const isTTY = (process.stderr.isTTY || process.stdout.isTTY) ?? false;
    // Determine color support
    let supportsColor;
    if (colorOverride !== undefined) {
        supportsColor = colorOverride;
    }
    else if (process.env['NO_COLOR']) {
        supportsColor = false;
    }
    else if (process.env['FORCE_COLOR']) {
        supportsColor = true;
    }
    else {
        supportsColor = isTTY && chalk.level > 0;
    }
    // Configure chalk based on color support
    if (!supportsColor) {
        chalk.level = 0;
    }
    const columns = process.stderr.columns ?? process.stdout.columns ?? 80;
    return {
        isTTY,
        supportsColor,
        columns,
    };
}
/**
 * Get a timestamp for CI/non-TTY output.
 */
export function timestamp() {
    return new Date().toISOString();
}
//# sourceMappingURL=tty.js.map
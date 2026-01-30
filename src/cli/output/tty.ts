import chalk from 'chalk';

/**
 * Output mode configuration based on terminal capabilities.
 */
export interface OutputMode {
  /** Whether stdout is a TTY */
  isTTY: boolean;
  /** Whether colors are supported */
  supportsColor: boolean;
  /** Terminal width in columns */
  columns: number;
}

/**
 * Detect terminal capabilities.
 * @param colorOverride - Optional override for color support (--color / --no-color)
 */
export function detectOutputMode(colorOverride?: boolean): OutputMode {
  // Check both stderr and stdout for TTY - some environments have TTY on one but not the other
  const streamIsTTY = (process.stderr.isTTY || process.stdout.isTTY) ?? false;

  // Treat dumb terminals as non-TTY (e.g., TERM=dumb used by some editors/agents)
  const term = process.env['TERM'] ?? '';
  const isDumbTerminal = term === 'dumb' || term === '';

  const isTTY = streamIsTTY && !isDumbTerminal;

  // Determine color support
  let supportsColor: boolean;
  if (colorOverride !== undefined) {
    supportsColor = colorOverride;
  } else if (process.env['NO_COLOR']) {
    supportsColor = false;
  } else if (process.env['FORCE_COLOR']) {
    supportsColor = true;
  } else {
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
export function timestamp(): string {
  return new Date().toISOString();
}

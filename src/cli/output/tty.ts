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
  const isTTY = process.stdout.isTTY ?? false;

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

  const columns = process.stdout.columns ?? 80;

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

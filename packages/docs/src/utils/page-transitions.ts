import { fade } from 'astro:transitions';

const baseFade = fade({ duration: '120ms' });
const STAGGER_STEP_MS = 18;
const EXIT_DURATION_MS = 180;
const ENTRY_DURATION_MS = 180;
const ENTRY_DELAY_MS = 90;

export function createStaggeredPageTransition(index: number) {
  const offset = Math.max(0, Math.min(index, 5)) * STAGGER_STEP_MS;

  return {
    ...baseFade,
    'nav-left': {
      old: [
        {
          name: 'pageFadeOutToRight',
          duration: `${EXIT_DURATION_MS}ms`,
          delay: `${offset}ms`,
          easing: 'cubic-bezier(0.55, 0, 0.8, 0.2)',
          fillMode: 'both',
        },
      ],
      new: [
        {
          name: 'pageFadeInFromLeft',
          duration: `${ENTRY_DURATION_MS}ms`,
          delay: `${ENTRY_DELAY_MS + offset}ms`,
          easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
          fillMode: 'both',
        },
      ],
    },
    'nav-right': {
      old: [
        {
          name: 'pageFadeOutToLeft',
          duration: `${EXIT_DURATION_MS}ms`,
          delay: `${offset}ms`,
          easing: 'cubic-bezier(0.55, 0, 0.8, 0.2)',
          fillMode: 'both',
        },
      ],
      new: [
        {
          name: 'pageFadeInFromRight',
          duration: `${ENTRY_DURATION_MS}ms`,
          delay: `${ENTRY_DELAY_MS + offset}ms`,
          easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
          fillMode: 'both',
        },
      ],
    },
  } as const;
}

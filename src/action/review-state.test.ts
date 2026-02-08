import { describe, it, expect } from 'vitest';
import {
  findBotReviewState,
} from './review-state.js';

describe('findBotReviewState', () => {
  const botLogin = 'warden[bot]';

  it('returns null when no reviews exist', () => {
    expect(findBotReviewState([], botLogin)).toBeNull();
  });

  it('returns null when no reviews from bot exist', () => {
    const reviews = [
      { id: 1, state: 'APPROVED', user: { login: 'human-reviewer' } },
      { id: 2, state: 'COMMENTED', user: { login: 'other-bot[bot]' } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toBeNull();
  });

  it('returns most recent bot review state and id', () => {
    const reviews = [
      { id: 10, state: 'CHANGES_REQUESTED', user: { login: botLogin } },
      { id: 11, state: 'APPROVED', user: { login: 'human-reviewer' } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toEqual({ state: 'CHANGES_REQUESTED', reviewId: 10 });
  });

  it('returns most recent when multiple bot reviews exist', () => {
    const reviews = [
      { id: 10, state: 'CHANGES_REQUESTED', user: { login: botLogin } }, // older
      { id: 20, state: 'APPROVED', user: { login: botLogin } }, // newer
    ];
    expect(findBotReviewState(reviews, botLogin)).toEqual({ state: 'APPROVED', reviewId: 20 });
  });

  it('returns null when most recent bot review is DISMISSED', () => {
    const reviews = [
      { id: 10, state: 'CHANGES_REQUESTED', user: { login: botLogin } }, // older
      { id: 20, state: 'DISMISSED', user: { login: botLogin } }, // newer - user dismissed
    ];
    expect(findBotReviewState(reviews, botLogin)).toBeNull();
  });

  it('does not look past DISMISSED review to find older state', () => {
    const reviews = [
      { id: 10, state: 'CHANGES_REQUESTED', user: { login: botLogin } }, // oldest
      { id: 20, state: 'APPROVED', user: { login: botLogin } }, // middle
      { id: 30, state: 'DISMISSED', user: { login: botLogin } }, // newest - dismissed
    ];
    // Should return null, not APPROVED or CHANGES_REQUESTED
    expect(findBotReviewState(reviews, botLogin)).toBeNull();
  });

  it('ignores other bots DISMISSED state', () => {
    const reviews = [
      { id: 10, state: 'CHANGES_REQUESTED', user: { login: botLogin } },
      { id: 20, state: 'DISMISSED', user: { login: 'other-bot[bot]' } }, // different bot
    ];
    // Our bot's CHANGES_REQUESTED should still be found
    expect(findBotReviewState(reviews, botLogin)).toEqual({ state: 'CHANGES_REQUESTED', reviewId: 10 });
  });

  it('handles reviews with null user', () => {
    const reviews = [
      { id: 10, state: 'CHANGES_REQUESTED', user: null },
      { id: 20, state: 'APPROVED', user: { login: botLogin } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toEqual({ state: 'APPROVED', reviewId: 20 });
  });

  it('handles reviews with missing user', () => {
    const reviews = [
      { id: 10, state: 'CHANGES_REQUESTED' } as { id: number; state: string; user?: { login: string } | null },
      { id: 20, state: 'COMMENTED', user: { login: botLogin } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toEqual({ state: 'COMMENTED', reviewId: 20 });
  });

  it('skips unknown review states', () => {
    const reviews = [
      { id: 10, state: 'CHANGES_REQUESTED', user: { login: botLogin } },
      { id: 20, state: 'PENDING', user: { login: botLogin } }, // unknown state
    ];
    // Should skip PENDING and return CHANGES_REQUESTED
    expect(findBotReviewState(reviews, botLogin)).toEqual({ state: 'CHANGES_REQUESTED', reviewId: 10 });
  });
});



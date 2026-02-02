import { describe, it, expect } from 'vitest';
import { findBotReviewState } from './review-state.js';

describe('findBotReviewState', () => {
  const botLogin = 'warden[bot]';

  it('returns null when no reviews exist', () => {
    expect(findBotReviewState([], botLogin)).toBeNull();
  });

  it('returns null when no reviews from bot exist', () => {
    const reviews = [
      { state: 'APPROVED', user: { login: 'human-reviewer' } },
      { state: 'COMMENTED', user: { login: 'other-bot[bot]' } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toBeNull();
  });

  it('returns most recent bot review state', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } },
      { state: 'APPROVED', user: { login: 'human-reviewer' } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toBe('CHANGES_REQUESTED');
  });

  it('returns most recent when multiple bot reviews exist', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } }, // older
      { state: 'APPROVED', user: { login: botLogin } }, // newer
    ];
    expect(findBotReviewState(reviews, botLogin)).toBe('APPROVED');
  });

  it('returns null when most recent bot review is DISMISSED', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } }, // older
      { state: 'DISMISSED', user: { login: botLogin } }, // newer - user dismissed
    ];
    expect(findBotReviewState(reviews, botLogin)).toBeNull();
  });

  it('does not look past DISMISSED review to find older state', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } }, // oldest
      { state: 'APPROVED', user: { login: botLogin } }, // middle
      { state: 'DISMISSED', user: { login: botLogin } }, // newest - dismissed
    ];
    // Should return null, not APPROVED or CHANGES_REQUESTED
    expect(findBotReviewState(reviews, botLogin)).toBeNull();
  });

  it('ignores other bots DISMISSED state', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } },
      { state: 'DISMISSED', user: { login: 'other-bot[bot]' } }, // different bot
    ];
    // Our bot's CHANGES_REQUESTED should still be found
    expect(findBotReviewState(reviews, botLogin)).toBe('CHANGES_REQUESTED');
  });

  it('handles reviews with null user', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: null },
      { state: 'APPROVED', user: { login: botLogin } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toBe('APPROVED');
  });

  it('handles reviews with missing user', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED' } as { state: string; user?: { login: string } | null },
      { state: 'COMMENTED', user: { login: botLogin } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toBe('COMMENTED');
  });

  it('skips unknown review states', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } },
      { state: 'PENDING', user: { login: botLogin } }, // unknown state
    ];
    // Should skip PENDING and return CHANGES_REQUESTED
    expect(findBotReviewState(reviews, botLogin)).toBe('CHANGES_REQUESTED');
  });
});

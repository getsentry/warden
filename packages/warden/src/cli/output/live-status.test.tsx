import { render } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveStatusList } from './live-status.js';

describe('LiveStatusList', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows a live elapsed timer for running items and freezes the final duration on completion', async () => {
    vi.useFakeTimers();
    let now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);

    const view = render(
      <LiveStatusList items={[{
        label: 'authz',
        status: 'running',
        startedAt: 500,
        showRunningDuration: true,
      }]} />,
    );

    expect(view.lastFrame()).toContain('authz');
    expect(view.lastFrame()).toContain('[500ms]');

    now = 1_500;
    await vi.advanceTimersByTimeAsync(250);
    expect(view.lastFrame()).toContain('[1.0s]');

    view.rerender(
      <LiveStatusList items={[{
        label: 'authz',
        status: 'done',
        durationMs: 1_000,
      }]} />,
    );
    expect(view.lastFrame()).toContain('[1.0s]');

    view.unmount();
  });

  it('shows cached completions without inventing a duration', () => {
    const view = render(
      <LiveStatusList items={[{
        label: 'authz',
        status: 'done',
        detail: '[cached]',
      }]} />,
    );

    const frame = view.lastFrame();
    expect(frame).toContain('[cached]');
    expect(frame).not.toContain('[1.0s]');

    view.unmount();
  });
});

import { useState, useEffect } from 'react';

interface CounterProps {
  initialValue: number;
  step: number;
  intervalMs: number;
}

/**
 * An auto-incrementing counter that ticks at a given interval.
 */
export function AutoCounter({ initialValue, step, intervalMs }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  useEffect(() => {
    // Bug: This closure captures `count` once at mount time.
    // Every tick reads the same stale `count` value and sets
    // count to initialValue + step, over and over. The counter
    // never actually increments past the first tick.
    const id = setInterval(() => {
      setCount(count + step);
    }, intervalMs);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <span data-testid="count">{count}</span>
    </div>
  );
}

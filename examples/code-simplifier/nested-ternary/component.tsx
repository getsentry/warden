import React from 'react';

interface StatusBadgeProps {
  isLoading: boolean;
  hasError: boolean;
  isSuccess: boolean;
}

export function StatusBadge({ isLoading, hasError, isSuccess }: StatusBadgeProps) {
  // COMPLEX: Nested ternary operators - hard to read
  const status = isLoading ? 'loading' : hasError ? 'error' : isSuccess ? 'success' : 'idle';

  // COMPLEX: Another nested ternary
  const color = status === 'loading' ? 'blue' : status === 'error' ? 'red' : status === 'success' ? 'green' : 'gray';

  // COMPLEX: Even more nesting
  const icon = isLoading
    ? 'spinner'
    : hasError
      ? 'x-circle'
      : isSuccess
        ? 'check-circle'
        : 'minus-circle';

  return (
    <div className={`badge badge-${color}`}>
      <span className={`icon icon-${icon}`} />
      {status}
    </div>
  );
}

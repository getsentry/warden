import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { Exit, Cause, Option } from 'effect';
import type { Effect } from 'effect';
import type { DashboardHttp, DashboardRuntime, RequestError } from './api.js';

const RuntimeContext = createContext<DashboardRuntime | null>(null);

interface RuntimeProviderProps {
  runtime: DashboardRuntime;
  children: ReactNode;
}

/** Share one Effect runtime across the app. */
export function RuntimeProvider({ runtime, children }: RuntimeProviderProps): JSX.Element {
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}

function useRuntime(): DashboardRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('Dashboard runtime is missing.');
  return runtime;
}

export type RemoteData<A> =
  | { status: 'loading' }
  | { status: 'success'; data: A }
  | { status: 'error'; message: string };

function redirectToLogin(): void {
  window.location.assign(
    `/api/auth/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`,
  );
}

/** Interrupt obsolete requests and prevent late responses from replacing the current screen. */
export function useQuery<A>(
  request: Effect.Effect<A, RequestError, DashboardHttp> | null,
  revision = 0,
): RemoteData<A> {
  const runtime = useRuntime();
  const [result, setResult] = useState<{
    request: typeof request;
    revision: number;
    value: RemoteData<A>;
  }>(() => ({ request, revision, value: { status: 'loading' } }));
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    void runtime.runPromiseExit(request, { signal: controller.signal }).then((exit) => {
      if (controller.signal.aborted) return;
      if (Exit.isSuccess(exit)) {
        setResult({ request, revision, value: { status: 'success', data: exit.value } });
      } else {
        const failure = Cause.failureOption(exit.cause);
        if (Option.isSome(failure) && failure.value.status === 401) {
          redirectToLogin();
          return;
        }
        setResult({
          request,
          revision,
          value: {
            status: 'error',
            message: Option.isSome(failure)
              ? failure.value.message
              : 'Could not load service data. Try again.',
          },
        });
      }
    });
    return () => controller.abort();
  }, [request, runtime, revision]);
  return result.request === request && result.revision === revision
    ? result.value
    : { status: 'loading' };
}

interface Action {
  run<A>(effect: Effect.Effect<A, RequestError, DashboardHttp>): Promise<A | undefined>;
  pending: boolean;
  error: string | null;
}

/** Prevent duplicate submissions and cancel pending actions when a view closes. */
export function useAction(): Action {
  const runtime = useRuntime();
  const active = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const run = useCallback(
    async <A,>(effect: Effect.Effect<A, RequestError, DashboardHttp>): Promise<A | undefined> => {
      if (active.current) return undefined;
      const controller = new AbortController();
      active.current = controller;
      setPending(true);
      setError(null);
      const exit = await runtime.runPromiseExit(effect, { signal: controller.signal });
      if (controller.signal.aborted) return undefined;
      active.current = null;
      setPending(false);
      if (Exit.isSuccess(exit)) return exit.value;
      const failure = Cause.failureOption(exit.cause);
      if (Option.isSome(failure) && failure.value.status === 401) {
        redirectToLogin();
      } else {
        setError(Option.isSome(failure) ? failure.value.message : 'Request failed. Try again.');
      }
      return undefined;
    },
    [runtime],
  );
  return { run, pending, error };
}

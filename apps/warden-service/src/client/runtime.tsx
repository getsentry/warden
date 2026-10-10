import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Exit, Cause, Option } from 'effect';
import type { Effect } from 'effect';
import type { DashboardHttp, DashboardRuntime, RequestError } from './api.js';

const RuntimeContext = createContext<DashboardRuntime | null>(null);

/** Supply the application's Effect runtime to queries and user actions. */
export function RuntimeProvider({
  runtime,
  children,
}: {
  runtime: DashboardRuntime;
  children: ReactNode;
}) {
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}

/** Read the injected runtime, including the test runtime used by browser integration tests. */
export function useRuntime() {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('Dashboard runtime is missing.');
  return runtime;
}

export type RemoteData<A> =
  { status: 'loading' } | { status: 'success'; data: A } | { status: 'error'; message: string };

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
          window.location.assign(
            `/api/auth/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`,
          );
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

/** Run user-triggered IO once, with typed feedback and cancellation on unmount. */
export function useAction() {
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
        window.location.assign(
          `/api/auth/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`,
        );
      } else {
        setError(Option.isSome(failure) ? failure.value.message : 'Request failed. Try again.');
      }
      return undefined;
    },
    [runtime],
  );
  return { run, pending, error };
}

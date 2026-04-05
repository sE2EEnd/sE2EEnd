import { useState, useEffect, useCallback, useRef } from 'react';

interface AsyncState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

/**
 * Runs an async function on mount and exposes loading/error/data state.
 * @param fn      The async function to execute. May be re-created each render — the hook always calls the latest version.
 * @param onError Optional function to convert a thrown error into a display string.
 */
export function useAsync<T>(fn: () => Promise<T>, onError?: (err: unknown) => string) {
  const [state, setState] = useState<AsyncState<T>>({ loading: true, error: null, data: null });
  const fnRef = useRef(fn);
  const onErrorRef = useRef(onError);

  // Keep refs up-to-date without adding them to useCallback deps
  useEffect(() => {
    fnRef.current = fn;
    onErrorRef.current = onError;
  });

  const execute = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      setState({ loading: false, error: null, data });
    } catch (err) {
      const msg = onErrorRef.current
        ? onErrorRef.current(err)
        : err instanceof Error ? err.message : String(err);
      setState(s => ({ ...s, loading: false, error: msg }));
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState is called asynchronously inside execute(), not synchronously
  useEffect(() => { void execute(); }, [execute]);

  return { ...state, refetch: execute };
}

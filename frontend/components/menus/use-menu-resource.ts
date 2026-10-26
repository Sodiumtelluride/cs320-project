"use client";

import { useEffect, useState } from "react";

type ResourceState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

export function useMenuResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    load: typeof load;
    version: number;
    state: ResourceState<T>;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    Promise.resolve().then(() => load(controller.signal)).then(
      (data) => {
        if (current) setSnapshot({ load, version, state: { status: "success", data } });
      },
      (reason: unknown) => {
        if (current && !controller.signal.aborted) {
          const error = reason instanceof Error ? reason : new Error("Unable to load menu information.");
          setSnapshot({ load, version, state: { status: "error", error } });
        }
      },
    );
    return () => { current = false; controller.abort(); };
  }, [load, version]);

  const state: ResourceState<T> = snapshot?.load === load && snapshot.version === version
    ? snapshot.state : { status: "loading" };
  return { state, retry: () => setVersion((value) => value + 1) };
}

import { useEffect, useRef } from "react";
import { useRealtime, type ClinicResource } from "../context/RealtimeContext";

export function useRealtimeRefresh(
  resources: ClinicResource[],
  onRefresh: () => void | Promise<void>,
) {
  const { change } = useRealtime();
  const callbackRef = useRef(onRefresh);
  const lastProcessedRef = useRef<string | null>(null);
  const resourcesKey = resources.slice().sort().join(",");

  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!change || !change.changedAt) return;
    const changeKey = `${change.resource}:${change.id ?? ""}:${change.changedAt}:${change.seq ?? ""}`;
    if (lastProcessedRef.current === changeKey) return;

    const resourceList = resourcesKey.split(",") as ClinicResource[];
    if (resourceList.includes(change.resource)) {
      lastProcessedRef.current = changeKey;
      void callbackRef.current();
    }
  }, [change, resourcesKey]);
}

import { useEffect, useRef } from "react";
import { useRealtime, type ClinicResource } from "../context/RealtimeContext";

export function useRealtimeRefresh(
  resources: ClinicResource[],
  onRefresh: () => void | Promise<void>,
) {
  const { change } = useRealtime();
  const callbackRef = useRef(onRefresh);

  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!change) return;
    if (resources.includes(change.resource)) {
      void callbackRef.current();
    }
  }, [change, resources]);
}

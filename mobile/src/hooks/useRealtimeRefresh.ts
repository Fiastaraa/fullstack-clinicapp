import { useEffect } from "react";
import type { ClinicChange } from "../context/RealtimeContext";
import { useRealtime } from "../context/RealtimeContext";

export function useRealtimeRefresh(
  resources: ClinicChange["resource"][],
  refresh: () => void
) {
  const { change } = useRealtime();
  const key = resources.join("|");
  useEffect(() => {
    if (change && resources.includes(change.resource)) refresh();
  }, [change?.changedAt, change?.resource, key]);
}

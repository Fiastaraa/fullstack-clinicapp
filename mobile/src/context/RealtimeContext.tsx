import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../services/config";
import { useSession } from "./SessionContext";

export type ClinicChange = {
  resource: "visits" | "patients" | "reminders" | "prescriptions" | "medicines" | "invoices";
  id?: number;
  changedAt: string;
};

const RealtimeContext = createContext<{ change: ClinicChange | null }>({
  change: null
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token } = useSession();
  const [change, setChange] = useState<ClinicChange | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"]
    });
    socket.on("clinic:data-changed", setChange);
    socket.on("connect_error", (err) => {
      console.warn("Realtime socket warning:", err?.message || err);
    });
    return () => {
      socket.off("clinic:data-changed", setChange);
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [token]);

  const value = useMemo(() => ({ change }), [change]);
  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

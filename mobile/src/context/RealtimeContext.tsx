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
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000
    });
    socket.on("clinic:data-changed", setChange);
    socket.on("connect_error", (err) => {
      // In React Native Expo, transient transport upgrades or reconnects can occur
      if (__DEV__) {
        console.log("Realtime socket info:", err?.message || err);
      }
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

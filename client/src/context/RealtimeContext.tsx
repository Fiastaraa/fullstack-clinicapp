import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

export type ClinicResource =
  | "visits"
  | "patients"
  | "reminders"
  | "prescriptions"
  | "medicines"
  | "invoices";

export type ClinicChange = {
  resource: ClinicResource;
  id?: number;
  changedAt: string;
  seq?: number;
};

const RealtimeContext = createContext<{ change: ClinicChange | null }>({
  change: null,
});

const getSocketUrl = () => {
  const customUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (customUrl) return customUrl;
  if (typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:3001/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [change, setChange] = useState<ClinicChange | null>(null);

  useEffect(() => {
    if (!token) return;

    let seq = 0;
    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("[Realtime] Connected to WebSocket at", socketUrl);
    });

    socket.on("clinic:data-changed", (data: ClinicChange) => {
      console.log("[Realtime] Data changed event received:", data);
      setChange({ ...data, seq: ++seq });
    });

    socket.on("connect_error", (err) => {
      console.warn("[Realtime] Socket connection error:", err.message);
    });

    return () => {
      socket.off("connect");
      socket.off("clinic:data-changed");
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

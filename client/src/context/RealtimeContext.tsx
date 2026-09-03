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
};

const RealtimeContext = createContext<{ change: ClinicChange | null }>({
  change: null,
});

const getSocketUrl = () => {
  const customUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (customUrl) return customUrl;
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:3001/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [change, setChange] = useState<ClinicChange | null>(null);

  useEffect(() => {
    if (!token) return;

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("clinic:data-changed", (data: ClinicChange) => {
      setChange(data);
    });

    return () => {
      socket.off("clinic:data-changed");
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

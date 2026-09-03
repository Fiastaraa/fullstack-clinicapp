import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Patient, RegisterPatientInput, User } from "../types";
import {
  currentUser,
  login as loginRequest,
  myProfile,
  register as registerRequest,
  updateMyProfile
} from "../services/authService";
import { setAccessToken } from "../services/api";
import { readToken, saveToken } from "../services/tokenStore";

type SessionValue = {
  token: string | null;
  user: User | null;
  patient: Patient | null;
  isHydrating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterPatientInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (input: Partial<Patient>) => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  async function clearSession() {
    setAccessToken(null);
    setToken(null);
    setUser(null);
    setPatient(null);
    await saveToken(null);
  }

  async function loadSession(nextToken: string) {
    setAccessToken(nextToken);
    const [userResponse, profileResponse] = await Promise.all([
      currentUser(),
      myProfile()
    ]);
    if (userResponse.data.user.role !== "PATIENT") {
      throw new Error("Akun ini bukan akun pasien.");
    }
    setToken(nextToken);
    setUser(userResponse.data.user);
    setPatient(profileResponse.data);
  }

  useEffect(() => {
    let active = true;
    readToken()
      .then(async (storedToken) => {
        if (!storedToken || !active) return;
        await loadSession(storedToken);
      })
      .catch(() => clearSession())
      .finally(() => {
        if (active) setIsHydrating(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const response = await loginRequest(email, password);
    if (response.data.user.role !== "PATIENT") {
      throw new Error("Gunakan akun pasien untuk masuk ke aplikasi ini.");
    }
    await saveToken(response.data.token);
    await loadSession(response.data.token);
  }

  async function register(input: RegisterPatientInput) {
    await registerRequest(input);
    await login(input.email, input.password);
  }

  async function logout() {
    await clearSession();
  }

  async function refreshProfile() {
    const response = await myProfile();
    setPatient(response.data);
  }

  async function updateProfile(input: Partial<Patient>) {
    const response = await updateMyProfile(input);
    setPatient(response.data);
    if (input.name && user) setUser({ ...user, name: input.name });
  }

  const value = useMemo(
    () => ({
      token,
      user,
      patient,
      isHydrating,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile
    }),
    [token, user, patient, isHydrating]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

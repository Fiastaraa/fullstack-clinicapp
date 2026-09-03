import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import Login from "../pages/auth/Login";
import RoleLayout from "../layouts/RoleLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import PatientsPage from "../pages/admin/PatientsPage";
import PatientDetailPage from "../pages/admin/PatientDetailPage";
import RegistrationPage from "../pages/admin/RegistrationPage";
import AdminQueue from "../pages/admin/QueuePage";
import InvoicesPage from "../pages/admin/InvoicesPage";
import ReportsPage from "../pages/admin/ReportsPage";
import UsersPage from "../pages/admin/UsersPage";
import SettingsPage from "../pages/admin/SettingsPage";
import DoctorDashboard from "../pages/doctor/DoctorDashboard";
import DoctorQueue from "../pages/doctor/DoctorQueue";
import DoctorPatients from "../pages/doctor/Patients";
import Consultation from "../pages/doctor/Consultation";
import Prescriptions from "../pages/doctor/Prescriptions";
import DoctorNotes from "../pages/doctor/Notes";
import DoctorSchedule from "../pages/doctor/Schedule";
import NurseDashboard from "../pages/nurse/NurseDashboard";
import NurseQueue from "../pages/nurse/Queue";
import NurseSearch from "../pages/nurse/Search";
import NursePatient from "../pages/nurse/PatientInfo";
import Assessment from "../pages/nurse/Assessment";
import Vitals from "../pages/nurse/Vitals";
import NurseNotes from "../pages/nurse/Notes";
import NurseSchedule from "../pages/nurse/Schedule";
import PharmacistDashboard from "../pages/pharmacist/PharmacistDashboard";
import PharmacistQueue from "../pages/pharmacist/Queue";
import Inventory from "../pages/pharmacist/Inventory";
import RxDetail from "../pages/pharmacist/Prescriptions";
import Stock from "../pages/pharmacist/Stock";
import Notifications from "../pages/pharmacist/Notifications";
import PharmacyReports from "../pages/pharmacist/Reports";
import PharmacySchedule from "../pages/pharmacist/Schedule";
import type { UserRole } from "../types/auth";

const staffHome: Record<UserRole, string> = {
  ADMIN: "/dashboard/admin",
  DOCTOR: "/dashboard/doctor",
  NURSE: "/dashboard/nurse",
  PHARMACIST: "/dashboard/pharmacist",
};

function Redirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={staffHome[user.role]} replace />;
}
const R = ({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) => <ProtectedRoute allowedRoles={roles}>{children}</ProtectedRoute>;
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Redirect />} />
        <Route
          element={
            <R roles={["ADMIN"]}>
              <RoleLayout />
            </R>
          }
        >
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/dashboard/admin/patients" element={<PatientsPage />} />
          <Route
            path="/dashboard/admin/patients/:patientId"
            element={<PatientDetailPage />}
          />
          <Route
            path="/dashboard/admin/registration"
            element={<RegistrationPage />}
          />
          <Route path="/dashboard/admin/queue" element={<AdminQueue />} />
          <Route path="/dashboard/admin/invoices" element={<InvoicesPage />} />
          <Route path="/dashboard/admin/reports" element={<ReportsPage />} />
          <Route path="/dashboard/admin/users" element={<UsersPage />} />
          <Route path="/dashboard/admin/settings" element={<SettingsPage />} />
        </Route>
        <Route
          element={
            <R roles={["DOCTOR"]}>
              <RoleLayout />
            </R>
          }
        >
          <Route path="/dashboard/doctor" element={<DoctorDashboard />} />
          <Route path="/dashboard/doctor/queue" element={<DoctorQueue />} />
          <Route
            path="/dashboard/doctor/patients"
            element={<DoctorPatients />}
          />
          <Route
            path="/dashboard/doctor/consultation"
            element={<Consultation />}
          />
          <Route
            path="/dashboard/doctor/diagnosis"
            element={<Navigate to="/dashboard/doctor/consultation" replace />}
          />
          <Route
            path="/dashboard/doctor/prescriptions"
            element={<Prescriptions />}
          />
          <Route path="/dashboard/doctor/notes" element={<DoctorNotes />} />
          <Route
            path="/dashboard/doctor/schedule"
            element={<DoctorSchedule />}
          />
        </Route>
        <Route
          element={
            <R roles={["NURSE"]}>
              <RoleLayout />
            </R>
          }
        >
          <Route path="/dashboard/nurse" element={<NurseDashboard />} />
          <Route path="/dashboard/nurse/queue" element={<NurseQueue />} />
          <Route path="/dashboard/nurse/search" element={<NurseSearch />} />
          <Route path="/dashboard/nurse/patient" element={<NursePatient />} />
          <Route path="/dashboard/nurse/assessment" element={<Assessment />} />
          <Route path="/dashboard/nurse/vitals" element={<Vitals />} />
          <Route path="/dashboard/nurse/notes" element={<NurseNotes />} />
          <Route path="/dashboard/nurse/schedule" element={<NurseSchedule />} />
        </Route>
        <Route
          element={
            <R roles={["PHARMACIST"]}>
              <RoleLayout />
            </R>
          }
        >
          <Route
            path="/dashboard/pharmacist"
            element={<PharmacistDashboard />}
          />
          <Route
            path="/dashboard/pharmacist/queue"
            element={<PharmacistQueue />}
          />
          <Route
            path="/dashboard/pharmacist/inventory"
            element={<Inventory />}
          />
          <Route
            path="/dashboard/pharmacist/prescriptions"
            element={<RxDetail />}
          />
          <Route path="/dashboard/pharmacist/stock" element={<Stock />} />
          <Route
            path="/dashboard/pharmacist/notifications"
            element={<Notifications />}
          />
          <Route
            path="/dashboard/pharmacist/reports"
            element={<PharmacyReports />}
          />
          <Route
            path="/dashboard/pharmacist/schedule"
            element={<PharmacySchedule />}
          />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export type User = {
  id: number;
  name: string;
  email: string;
  role: "PATIENT";
  patientId?: number;
};

export type Patient = {
  id: number;
  name: string;
  nik?: string | null;
  birthDate?: string | null;
  gender: "Male" | "Female";
  age: number;
  phone: string;
  address: string;
};

export type Poli = {
  id: number;
  name: string;
  code: string;
};

export type Doctor = {
  id: number;
  name: string;
  specialization: string;
  poliId?: number | null;
  poli?: Poli | null;
};

export type Medicine = {
  id: number;
  name: string;
  dosage: string;
  price: number | string;
};

export type Prescription = {
  id: number;
  quantity: number;
  status: "PENDING" | "READY";
  medicine: Medicine;
};

export type Diagnosis = {
  id: number;
  diagnosisName: string;
  notes?: string | null;
};

export type Payment = {
  id: number;
  method: "CASH" | "TRANSFER" | "E_WALLET";
  paidDate: string;
};

export type Invoice = {
  id: number;
  consultationFee: number | string;
  medicineTotal: number | string;
  adminFee: number | string;
  tax: number | string;
  subtotal: number | string;
  total: number | string;
  status: "UNPAID" | "PAID";
  payments?: Payment[];
};

export type VisitStatus =
  | "WAITING"
  | "CALLED"
  | "IN_CONSULTATION"
  | "COMPLETED"
  | "PAID";

export type Visit = {
  id: number;
  patientId: number;
  doctorId: number;
  poliId?: number | null;
  queueNumber?: string | null;
  estimatedWaitMinutes?: number | null;
  visitDate: string;
  status: VisitStatus;
  complaint?: string | null;
  bloodPressure?: string | null;
  temperature?: number | null;
  weight?: number | null;
  height?: number | null;
  notes?: string | null;
  patient: Patient;
  doctor: Doctor;
  poli?: Poli | null;
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
  invoice?: Invoice | null;
};

export type Reminder = {
  id: number;
  patientId: number;
  type: "KONTROL" | "VAKSINASI" | "CEK_LAB";
  title: string;
  date: string;
  notes?: string | null;
  status: "PENDING" | "SENT" | "COMPLETED";
};

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export type RegisterPatientInput = {
  name: string;
  email: string;
  password: string;
  nik?: string;
  birthDate: string;
  gender: "Male" | "Female";
  phone: string;
  address: string;
};

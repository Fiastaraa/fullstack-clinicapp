import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  nik?: string;
  birthDate: Date;
  gender: "Male" | "Female";
  phone: string;
  address: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  const today = new Date();
  let age = today.getFullYear() - input.birthDate.getFullYear();
  const birthdayHasPassed =
    today.getMonth() > input.birthDate.getMonth() ||
    (today.getMonth() === input.birthDate.getMonth() &&
      today.getDate() >= input.birthDate.getDate());
  if (!birthdayHasPassed) age -= 1;

  const user = await prisma.$transaction(async (tx) => {
    if (input.nik) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(4, hashtext(${input.nik}))`;
    }

    const existingPatient = input.nik
      ? await tx.patient.findUnique({ where: { nik: input.nik } })
      : null;

    if (existingPatient?.userId) {
      throw new Error("NIK already registered");
    }

    if (
      existingPatient &&
      (!existingPatient.birthDate ||
        existingPatient.birthDate.toISOString().slice(0, 10) !==
          input.birthDate.toISOString().slice(0, 10))
    ) {
      throw new Error("Patient data does not match");
    }

    const createdUser = await tx.user.create({
      data: {
        name: existingPatient?.name ?? input.name,
        email: input.email,
        password: hashedPassword,
        role: "PATIENT",
      },
    });

    const patientData = {
      name: input.name,
      nik: input.nik,
      birthDate: input.birthDate,
      gender: input.gender,
      age,
      phone: input.phone,
      address: input.address,
      userId: createdUser.id,
    };

    if (existingPatient) {
      await tx.patient.update({
        where: { id: existingPatient.id },
        data: { userId: createdUser.id },
      });
    } else {
      await tx.patient.create({ data: patientData });
    }

    return createdUser;
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email.toLowerCase(),
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatch = await bcrypt.compare(input.password, user.password);

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "1d",
    },
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function getCurrentUser(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      patient: { select: { id: true } },
    },
  });
  if (!user) throw new Error("User not found");
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    patientId: user.patient?.id,
  };
}

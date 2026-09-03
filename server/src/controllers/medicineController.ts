import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { broadcastClinicChange } from "../lib/realtime.js";

const createMedicineSchema = z.object({
  name: z.string().min(1, "Nama obat wajib diisi"),
  dosage: z.string().min(1, "Dosis wajib diisi"),
  price: z.coerce.number().min(0, "Harga harus berupa angka positif"),
  stock: z.coerce.number().int().min(0, "Stok awal minimal 0").default(0),
});

const updateMedicineSchema = z.object({
  name: z.string().min(1).optional(),
  dosage: z.string().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).optional(),
});

const adjustStockSchema = z.object({
  adjustment: z.coerce.number().int(),
});

export async function getMedicines(req: Request, res: Response) {
  try {
    const search = String(req.query.search ?? "").trim();

    const medicines = await prisma.medicine.findMany({
      where: search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : undefined,
      include: {
        _count: {
          select: { prescriptions: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.json({
      success: true,
      data: medicines,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to load medicines",
    });
  }
}

export async function createMedicine(req: Request, res: Response) {
  try {
    const data = createMedicineSchema.parse(req.body);

    const medicine = await prisma.medicine.create({
      data: {
        name: data.name,
        dosage: data.dosage,
        price: data.price,
        stock: data.stock,
      },
    });
    broadcastClinicChange("medicines", medicine.id);

    return res.status(201).json({
      success: true,
      message: "Obat berhasil ditambahkan ke inventaris",
      data: medicine,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: error.issues,
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan obat",
    });
  }
}

export async function updateMedicine(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const data = updateMedicineSchema.parse(req.body);

    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Obat tidak ditemukan",
      });
    }

    const updated = await prisma.medicine.update({
      where: { id },
      data,
    });
    broadcastClinicChange("medicines", id);

    return res.json({
      success: true,
      message: "Data obat berhasil diperbarui",
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: error.issues,
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui obat",
    });
  }
}

export async function adjustStock(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const { adjustment } = adjustStockSchema.parse(req.body);

    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Obat tidak ditemukan",
      });
    }

    const newStock = existing.stock + adjustment;
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: `Stok tidak boleh kurang dari 0 (Sisa saat ini: ${existing.stock})`,
      });
    }

    const updated = await prisma.medicine.update({
      where: { id },
      data: { stock: newStock },
    });
    broadcastClinicChange("medicines", id);

    return res.json({
      success: true,
      message: `Stok obat berhasil diubah menjadi ${newStock}`,
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: error.issues,
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyesuaikan stok",
    });
  }
}

export async function deleteMedicine(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    const existing = await prisma.medicine.findUnique({
      where: { id },
      include: { _count: { select: { prescriptions: true } } },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Obat tidak ditemukan",
      });
    }

    if (existing._count.prescriptions > 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus obat yang sudah pernah diresepkan ke pasien.",
      });
    }

    await prisma.medicine.delete({ where: { id } });
    broadcastClinicChange("medicines", id);

    return res.json({
      success: true,
      message: "Obat berhasil dihapus dari inventaris",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus obat",
    });
  }
}

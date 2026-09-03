import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function getAdminDashboard(_req: Request, res: Response) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayWhere = {
      visitDate: {
        gte: startOfToday,
        lte: endOfToday,
      },
    };

    const [
      todayVisits,
      waiting,
      inConsultation,
      completed,
      paidInvoices,
      unpaidInvoices,
      revenue,
      queue,
    ] = await Promise.all([
      prisma.visit.count({
        where: todayWhere,
      }),

      prisma.visit.count({
        where: {
          ...todayWhere,
          status: "WAITING",
        },
      }),

      prisma.visit.count({
        where: {
          ...todayWhere,
          status: "IN_CONSULTATION",
        },
      }),

      prisma.visit.count({
        where: {
          ...todayWhere,
          status: "COMPLETED",
        },
      }),

      prisma.invoice.count({
        where: {
          status: "PAID",
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),

      prisma.invoice.count({
        where: {
          status: "UNPAID",
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),

      prisma.invoice.aggregate({
        where: {
          status: "PAID",
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        _sum: {
          total: true,
        },
      }),

      prisma.visit.findMany({
        where: todayWhere,
        orderBy: {
          visitDate: "asc",
        },
        take: 10,
        include: {
          patient: true,
          doctor: true,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        todayVisits,
        waiting,
        inConsultation,
        completed,
        paid: paidInvoices,
        unpaidInvoices,
        todayRevenue: revenue._sum.total ?? 0,
        queue,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
}

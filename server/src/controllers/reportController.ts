import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function getReports(req: Request, res: Response) {
  try {
    const range = String(req.query.range ?? "weekly");

    const now = new Date();
    const start = new Date(now);

    if (range === "daily") {
      start.setHours(0, 0, 0, 0);
    } else if (range === "monthly") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }

    const visits = await prisma.visit.findMany({
      where: {
        visitDate: {
          gte: start,
          lte: now,
        },
      },
      orderBy: {
        visitDate: "asc",
      },
    });

    const invoices = await prisma.invoice.findMany({
      where: {
        status: "PAID",
        createdAt: {
          gte: start,
          lte: now,
        },
      },
    });

    const revenue = invoices.reduce(
      (sum: number, invoice: any) => sum + Number(invoice.total),
      0,
    );

    const grouped: Record<
      string,
      {
        visits: number;
        revenue: number;
      }
    > = {};

    for (const visit of visits) {
      const key = visit.visitDate.toISOString().slice(0, 10);

      if (!grouped[key]) {
        grouped[key] = {
          visits: 0,
          revenue: 0,
        };
      }

      grouped[key].visits += 1;
    }

    for (const invoice of invoices) {
      const key = invoice.createdAt.toISOString().slice(0, 10);

      if (!grouped[key]) {
        grouped[key] = {
          visits: 0,
          revenue: 0,
        };
      }

      grouped[key].revenue += Number(invoice.total);
    }

    return res.json({
      success: true,
      data: {
        range,
        totalVisits: visits.length,
        totalRevenue: revenue,
        chart: Object.entries(grouped).map(([date, value]) => ({
          date,
          ...value,
        })),
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to load reports",
    });
  }
}

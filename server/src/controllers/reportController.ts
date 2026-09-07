import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function getReports(req: Request, res: Response) {
  try {
    const range = String(req.query.range ?? "weekly");
    const customStart = req.query.startDate ? new Date(String(req.query.startDate)) : null;
    const customEnd = req.query.endDate ? new Date(String(req.query.endDate)) : null;

    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (customStart && !isNaN(customStart.getTime())) {
      start = customStart;
      start.setHours(0, 0, 0, 0);
      if (customEnd && !isNaN(customEnd.getTime())) {
        end = customEnd;
        end.setHours(23, 59, 59, 999);
      }
    } else if (range === "daily") {
      start.setHours(0, 0, 0, 0);
    } else if (range === "monthly") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (range === "yearly") {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    } else if (range === "all") {
      start = new Date(2020, 0, 1);
    } else {
      // weekly: last 7 days
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }

    // Fetch visits with all relevant relations in date range
    const visits = await prisma.visit.findMany({
      where: {
        visitDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            gender: true,
            age: true,
            phone: true,
            nik: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
        poli: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        diagnoses: {
          select: {
            id: true,
            diagnosisName: true,
          },
        },
        invoice: {
          select: {
            id: true,
            total: true,
            status: true,
            payments: {
              select: {
                method: true,
                paidDate: true,
              },
            },
          },
        },
      },
      orderBy: {
        visitDate: "asc",
      },
    });

    // Also fetch all paid invoices within range to compute accurate revenue
    const invoices = await prisma.invoice.findMany({
      where: {
        status: "PAID",
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        payments: true,
      },
    });

    // 1. KPI Summary
    const totalVisits = visits.length;
    const completedVisits = visits.filter(
      (v) => v.status === "COMPLETED" || v.status === "PAID"
    ).length;
    const inProgressVisits = totalVisits - completedVisits;

    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    );
    const averageBill =
      invoices.length > 0 ? Math.round(totalRevenue / invoices.length) : 0;

    // 2. Trend Grouping (By Day)
    const trendMap = new Map<
      string,
      { date: string; formattedDate: string; visits: number; revenue: number }
    >();

    // Pre-populate days for weekly or daily to avoid empty chart gaps
    if (range === "weekly") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const fmt = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
        trendMap.set(iso, { date: iso, formattedDate: fmt, visits: 0, revenue: 0 });
      }
    }

    visits.forEach((v) => {
      const iso = v.visitDate.toISOString().slice(0, 10);
      const fmt = v.visitDate.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      const existing = trendMap.get(iso) || {
        date: iso,
        formattedDate: fmt,
        visits: 0,
        revenue: 0,
      };
      existing.visits += 1;
      trendMap.set(iso, existing);
    });

    invoices.forEach((inv) => {
      const iso = inv.createdAt.toISOString().slice(0, 10);
      const fmt = inv.createdAt.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      const existing = trendMap.get(iso) || {
        date: iso,
        formattedDate: fmt,
        visits: 0,
        revenue: 0,
      };
      existing.revenue += Number(inv.total);
      trendMap.set(iso, existing);
    });

    const chart = Array.from(trendMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // 3. Breakdown per Poliklinik
    const poliCountMap = new Map<string, number>();
    visits.forEach((v) => {
      const name = v.poli?.name || "Poli Umum";
      poliCountMap.set(name, (poliCountMap.get(name) || 0) + 1);
    });
    const poliBreakdown = Array.from(poliCountMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 4. Top 10 Diagnoses (ICD-10 / Penyakit Terbanyak)
    const diagnosisCountMap = new Map<string, number>();
    visits.forEach((v) => {
      v.diagnoses.forEach((d) => {
        const cleanName = d.diagnosisName.replace(/\s*\(Sekunder:.*\)$/i, "").trim();
        diagnosisCountMap.set(cleanName, (diagnosisCountMap.get(cleanName) || 0) + 1);
      });
    });
    const topDiagnoses = Array.from(diagnosisCountMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. Payment Methods Breakdown
    const paymentMethodsMap = new Map<string, { count: number; total: number }>();
    invoices.forEach((inv) => {
      inv.payments.forEach((p) => {
        const m = p.method || "CASH";
        const cur = paymentMethodsMap.get(m) || { count: 0, total: 0 };
        cur.count += 1;
        cur.total += Number(inv.total);
        paymentMethodsMap.set(m, cur);
      });
    });
    const paymentBreakdown = Array.from(paymentMethodsMap.entries()).map(
      ([method, data]) => ({
        method,
        label:
          method === "CASH"
            ? "Tunai (Kasir)"
            : method === "TRANSFER"
            ? "Transfer Bank"
            : "E-Wallet / QRIS",
        count: data.count,
        total: data.total,
      })
    );

    // 6. Humanized Smart Executive Summary (Analisis Teks Cerdas)
    let peakDay = chart.length > 0 ? chart.reduce((prev, curr) => (curr.visits > prev.visits ? curr : prev), chart[0]) : null;
    let topPoli = poliBreakdown.length > 0 ? poliBreakdown[0] : null;
    let topDiag = topDiagnoses.length > 0 ? topDiagnoses[0] : null;

    const executiveSummary = {
      periodLabel:
        range === "daily"
          ? "Hari Ini"
          : range === "weekly"
          ? "7 Hari Terakhir"
          : range === "monthly"
          ? "Bulan Ini"
          : range === "yearly"
          ? "Tahun Ini"
          : "Seluruh Periode",
      peakDayText: peakDay && peakDay.visits > 0
        ? `${peakDay.formattedDate} dengan ${peakDay.visits} kunjungan pasien`
        : "Belum ada kunjungan puncak tercatat",
      topPoliText: topPoli
        ? `${topPoli.name} (${topPoli.count} pasien, ${topPoli.percentage}% dari total)`
        : "Belum ada data poli",
      topDiagnosisText: topDiag
        ? `${topDiag.name} (${topDiag.count} kasus)`
        : "Belum ada diagnosa tercatat",
      financialHealth: `Total pendapatan lunas tercatat Rp ${totalRevenue.toLocaleString("id-ID")} dengan rata-rata transaksi Rp ${averageBill.toLocaleString("id-ID")} per pasien.`,
    };

    // 7. Recent detailed visit records for table/export
    const detailedVisits = visits.map((v) => ({
      id: v.id,
      queueNumber: v.queueNumber || `V-${v.id}`,
      visitDate: v.visitDate,
      patientName: v.patient?.name || `Pasien #${v.patientId}`,
      patientAge: v.patient?.age,
      patientGender: v.patient?.gender,
      doctorName: v.doctor?.name || "Dokter",
      poliName: v.poli?.name || "Poli Umum",
      primaryDiagnosis: v.diagnoses[0]?.diagnosisName || "Belum ada diagnosa",
      status: v.status,
      totalBill: v.invoice?.total ? Number(v.invoice.total) : 0,
      invoiceStatus: v.invoice?.status || "UNPAID",
      paymentMethod: v.invoice?.payments[0]?.method || "-",
    }));

    return res.json({
      success: true,
      data: {
        range,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalVisits,
        completedVisits,
        inProgressVisits,
        totalRevenue,
        averageBill,
        executiveSummary,
        chart,
        poliBreakdown,
        topDiagnoses,
        paymentBreakdown,
        detailedVisits,
      },
    });
  } catch (error) {
    console.error("Failed to load reports:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat data laporan klinik.",
    });
  }
}

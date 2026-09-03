import { useEffect, useState, useCallback } from "react";
import PageHeader from "../../components/common/PageHeader";
import { clinic, unwrap } from "../../services/clinicService";
import { downloadInvoicePdf } from "../../utils/invoicePdf";
import { useRealtimeRefresh } from "../../hooks/useRealtimeRefresh";
import { paymentService } from "../../services/paymentService";

type Invoice = {
  id: number;
  invoiceNumber?: string;
  invoice_id?: string;
  subtotal?: number;
  total?: number;
  status?: string;

  patient?: {
    name?: string;
    phone?: string;
    address?: string;
  };

  patientName?: string;

  doctor?: {
    name?: string;
  };

  doctorName?: string;

  visit?: {
    id?: number;
    visitDate?: string;
    visit_date?: string;
  };

  visitDate?: string;
  date?: string;

  items?: Array<{
    name?: string;
    medicine?: string;
    quantity?: number;
    price?: number;
  }>;

  prescriptions?: any[];
};

type VisitRow = {
  id: number;
  visitDate: string;
  patient?: any;
  doctor?: any;
  invoice?: any;
  prescriptions?: any[];
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function InvoicesPage() {
  const [rows, setRows] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [payingId, setPayingId] = useState<number | null>(null);

  const loadInvoices = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setMessage("");

      const response = await clinic.visits();

      const data = unwrap(response) as VisitRow[];

      setRows(data);
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          "Failed to load invoices."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices(true);
  }, [loadInvoices]);

  // Real-time auto fetch when invoices or visits change
  useRealtimeRefresh(["invoices", "visits"], loadInvoices);

  async function pay(id: number) {
    try {
      setPayingId(id);
      setMessage("");
      await clinic.payInvoice(id);
      setMessage("Pembayaran tunai berhasil dikonfirmasi.");
      await loadInvoices();
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          "Gagal mengonfirmasi pembayaran."
      );
    } finally {
      setPayingId(null);
    }
  }

  async function payWithMidtrans(id: number) {
    try {
      setPayingId(id);
      setMessage("");
      await paymentService.payInvoiceWithMidtrans(
        id,
        async () => {
          setMessage("Pembayaran Midtrans berhasil diselesaikan!");
          await loadInvoices();
        },
        async () => {
          setMessage("Menunggu konfirmasi pembayaran Midtrans...");
          await loadInvoices();
        },
        (err) => {
          setMessage(`Gagal memproses Midtrans: ${err}`);
        },
      );
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Gagal membuka pembayaran Midtrans.",
      );
    } finally {
      setPayingId(null);
    }
  }

  const invoices = rows
    .filter((row: any) => Boolean(row.invoice))
    .map((row: any) => {
      const inv = row.invoice;
      const items = (row.prescriptions || []).map((p: any) => ({
        name: p.medicine?.name || "Obat",
        quantity: p.quantity,
        price: Number(p.medicine?.price || 0),
      }));

      return {
        ...inv,
        patient: row.patient,
        patientName: row.patient?.name || "-",
        doctor: row.doctor,
        doctorName: row.doctor?.name || "-",
        visit: row,
        visitDate: row.visitDate,
        items,
        prescriptions: row.prescriptions,
      } as Invoice;
    });

  return (
    <>
      <PageHeader
        title="Invoices & Payments"
        subtitle="Review unpaid invoices and confirm payment."
      />

      {message && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-[#101A3D] text-left text-sm text-white">
                <th className="px-5 py-4">
                  Invoice
                </th>

                <th className="px-5 py-4">
                  Patient
                </th>

                <th className="px-5 py-4">
                  Subtotal
                </th>

                <th className="px-5 py-4">
                  Total
                </th>

                <th className="px-5 py-4">
                  Status
                </th>

                <th className="px-5 py-4">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-400"
                  >
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center"
                  >
                    <p className="font-semibold text-slate-600">
                      No invoices found
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Completed visits will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const patientName =
                    invoice.patient?.name ||
                    invoice.patientName ||
                    "-";

                  const status =
                    invoice.status || "UNPAID";

                  return (
                    <tr
                      key={invoice.id}
                      className="border-t border-slate-100"
                    >
                      {/* Invoice */}
                      <td className="px-5 py-5">
                        <p className="font-bold text-slate-900">
                          {invoice.invoiceNumber ||
                            invoice.invoice_id ||
                            `INV-${String(
                              invoice.id
                            ).padStart(5, "0")}`}
                        </p>
                      </td>

                      {/* Patient */}
                      <td className="px-5 py-5">
                        <p className="font-medium text-slate-700">
                          {patientName}
                        </p>
                      </td>

                      {/* Subtotal */}
                      <td className="px-5 py-5 text-sm text-slate-600">
                        {formatRupiah(
                          invoice.subtotal || 0
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-5 py-5 font-bold text-slate-900">
                        {formatRupiah(
                          invoice.total ||
                            invoice.subtotal ||
                            0
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-5">
                        {status === "PAID" ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            PAID
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                            UNPAID
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-5">
                        <div className="flex flex-wrap items-center gap-2">
                          {status === "PAID" ? (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                              Lunas
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={payingId === invoice.id}
                                onClick={() => payWithMidtrans(invoice.id)}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                              >
                                {payingId === invoice.id ? "Memproses..." : "Bayar Midtrans"}
                              </button>

                              <button
                                type="button"
                                disabled={payingId === invoice.id}
                                onClick={() => pay(invoice.id)}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Tunai / Cash
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              downloadInvoicePdf(invoice)
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            Download PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
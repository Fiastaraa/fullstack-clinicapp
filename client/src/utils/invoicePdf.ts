import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type InvoiceItem = {
  name?: string;
  medicine?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  amount?: number;
};

type InvoiceData = {
  id?: number;
  invoiceNumber?: string;
  invoice_id?: string;

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

  subtotal?: number;
  total?: number;

  status?: string;

  items?: InvoiceItem[];
  prescriptions?: InvoiceItem[];

  payment?: {
    method?: string;
    paidDate?: string;
  };
};

function formatRupiah(value = 0) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
  }).format(date);
}

export function downloadInvoicePdf(invoice: InvoiceData) {
  const pdf = new jsPDF();

  const invoiceNumber =
    invoice.invoiceNumber ||
    invoice.invoice_id ||
    `INV-${String(invoice.id || "00000").padStart(5, "0")}`;

  const patientName = invoice.patient?.name || invoice.patientName || "-";

  const doctorName = invoice.doctor?.name || invoice.doctorName || "-";

  const invoiceDate =
    invoice.date ||
    invoice.visitDate ||
    invoice.visit?.visitDate ||
    invoice.visit?.visit_date;

  const items = invoice.items || invoice.prescriptions || [];

  const subtotal =
    invoice.subtotal ||
    items.reduce((sum, item) => {
      const quantity = item.quantity || item.qty || 1;
      const price = item.price || item.amount || 0;

      return sum + quantity * price;
    }, 0);

  const total = invoice.total || subtotal;

  /*
   * HEADER
   */
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text("AssistDoc", 20, 25);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("CLINIC OUTPATIENT MANAGEMENT", 20, 32);

  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, 38, 190, 38);

  /*
   * INVOICE TITLE
   */
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("INVOICE", 20, 52);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  pdf.text(`Invoice Number : ${invoiceNumber}`, 20, 61);
  pdf.text(`Date           : ${formatDate(invoiceDate)}`, 20, 68);
  pdf.text(`Doctor         : ${doctorName}`, 20, 75);

  /*
   * PATIENT
   */
  pdf.setFont("helvetica", "bold");
  pdf.text("PATIENT", 125, 52);

  pdf.setFont("helvetica", "normal");
  pdf.text(patientName, 125, 61);

  if (invoice.patient?.phone) {
    pdf.text(invoice.patient.phone, 125, 68);
  }

  if (invoice.patient?.address) {
    const address = pdf.splitTextToSize(invoice.patient.address, 65);

    pdf.text(address, 125, 75);
  }

  /*
   * ITEMS
   */
  const tableRows =
    items.length > 0
      ? items.map((item) => {
          const quantity = item.quantity || item.qty || 1;

          const price = item.price || item.amount || 0;

          return [
            item.name || item.medicine || "Service",
            quantity,
            formatRupiah(price),
            formatRupiah(quantity * price),
          ];
        })
      : [
          [
            "Consultation / Medical Service",
            1,
            formatRupiah(subtotal),
            formatRupiah(subtotal),
          ],
        ];

  autoTable(pdf, {
    startY: 95,

    head: [["Description", "Qty", "Price", "Amount"]],

    body: tableRows,

    theme: "grid",

    headStyles: {
      fillColor: [16, 26, 61],
      textColor: 255,
      fontStyle: "bold",
    },

    styles: {
      fontSize: 9,
      cellPadding: 4,
    },

    columnStyles: {
      1: {
        halign: "center",
      },
      2: {
        halign: "right",
      },
      3: {
        halign: "right",
      },
    },
  });

  const finalY = (pdf as any).lastAutoTable.finalY + 12;

  /*
   * SUMMARY
   */
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  pdf.text("Subtotal", 125, finalY);

  pdf.text(formatRupiah(subtotal), 190, finalY, { align: "right" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);

  pdf.text("TOTAL", 125, finalY + 10);

  pdf.text(formatRupiah(total), 190, finalY + 10, { align: "right" });

  /*
   * STATUS
   */
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");

  pdf.text(
    `Status: ${(invoice.status || "UNPAID").toUpperCase()}`,
    20,
    finalY + 25,
  );

  if (invoice.payment?.method) {
    pdf.setFont("helvetica", "normal");

    pdf.text(`Payment Method: ${invoice.payment.method}`, 20, finalY + 32);
  }

  /*
   * FOOTER
   */
  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, 275, 190, 275);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  pdf.text("AssistDoc Clinic - Computer Generated Invoice", 20, 283);

  pdf.text("Thank you for using AssistDoc Clinic.", 20, 289);

  /*
   * DOWNLOAD
   */
  pdf.save(`${invoiceNumber}.pdf`);
}

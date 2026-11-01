import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function formatCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "N/A";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toISOString().split("T")[0];
}

/**
 * Trigger browser file download from Blob
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * ============================================================================
 * BOOKINGS EXPORTS
 * ============================================================================
 */

export function downloadBookingsCSV(bookings, filterSummary = {}) {
  const headers = [
    "Booking ID",
    "Reference Code",
    "Booked Date",
    "Guest Name",
    "Guest Email",
    "Guest Phone",
    "Program",
    "Location",
    "Activities / Sessions",
    "Seats",
    "Status",
    "Payment Type",
    "Total Amount ($)",
    "Paid Amount ($)",
    "Balance Due ($)",
    "Travel Agent",
    "Agent Promo Code",
    "Created At",
  ];

  const rows = bookings.map((b) => {
    const firstCust = b.items?.find((i) => i.customer?.name)?.customer;
    const guestName = firstCust?.name || b.leader?.name || "Direct Guest";
    const guestEmail = firstCust?.email || b.leader?.email || "N/A";
    const guestPhone = firstCust?.phone || b.leader?.contact || "N/A";

    const progTitle = b.items?.[0]?.session?.program?.title || "N/A";
    const locationName = b.items?.[0]?.session?.program?.location?.name || "N/A";
    const activities = (b.items || [])
      .map((i) => i.session?.name)
      .filter(Boolean)
      .join("; ");
    const totalSeats = (b.items || []).reduce(
      (sum, i) => sum + (i.quantity || 1),
      0
    );

    const totalAmt = Number(b.amount || 0).toFixed(2);
    const balAmt = Number(b.balance || 0).toFixed(2);
    const paidAmt = Math.max(0, Number(b.amount || 0) - Number(b.balance || 0)).toFixed(2);

    return [
      b.id,
      b.payment?.orderId || `RV-${b.id}`,
      formatDate(b.bookedDate),
      guestName,
      guestEmail,
      guestPhone,
      progTitle,
      locationName,
      activities,
      totalSeats,
      b.status || "PENDING",
      b.paymentType || "Full",
      totalAmt,
      paidAmt,
      balAmt,
      b.leader?.role === "LEADER" ? (b.leader?.name || "Travel Agent") : "Direct",
      b.leader?.role === "LEADER" ? (b.leader?.promoteCode || "None") : "None",
      formatDate(b.createdAt),
    ];
  });

  const csvRows = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  const csvBlob = new Blob(["\uFEFF" + csvRows.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const timestamp = new Date().toISOString().split("T")[0];
  downloadBlob(csvBlob, `bookings_report_${timestamp}.csv`);
}

export function downloadBookingsPDF(bookings, stats = {}, filterSummary = {}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  // Header Branding
  doc.setFillColor(45, 74, 34); // Brand dark green #2d4a22
  doc.rect(0, 0, 842, 60, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("THE CEYLON TEA EXPERIENCE", 36, 32);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Bookings & Reservations Report", 36, 48);

  const timestamp = new Date().toLocaleString();
  doc.setFontSize(9);
  doc.text(`Generated: ${timestamp}`, 680, 38);

  // Filter Summary Sub-header
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Report Criteria:", 36, 82);

  doc.setFont("helvetica", "normal");
  const filterDesc = [
    `Date Range: ${filterSummary.timeRange || "All"}`,
    filterSummary.status ? `Status: ${filterSummary.status}` : null,
    filterSummary.program ? `Program: ${filterSummary.program}` : null,
    filterSummary.leader ? `Travel Agent: ${filterSummary.leader}` : null,
    filterSummary.search ? `Search: "${filterSummary.search}"` : null,
    `Total Records: ${bookings.length}`,
  ]
    .filter(Boolean)
    .join("  |  ");

  doc.text(filterDesc, 115, 82);

  // Metric Summary Bar
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(36, 94, 770, 36, 4, 4, "F");

  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);

  const revText = `Total Revenue: ${formatCurrency(stats.totalRevenue)}`;
  const collText = `Collected: ${formatCurrency(stats.totalCollected)}`;
  const balText = `Pending Balance: ${formatCurrency(stats.totalBalance)}`;
  const seatsText = `Total Seats: ${stats.totalGuests || 0}`;

  doc.setFont("helvetica", "bold");
  doc.text(revText, 50, 116);
  doc.text(collText, 250, 116);
  doc.text(balText, 450, 116);
  doc.text(seatsText, 660, 116);

  // Table Data
  const tableData = bookings.map((b) => {
    const firstCust = b.items?.find((i) => i.customer?.name)?.customer;
    const guestName = firstCust?.name || b.leader?.name || "Direct Guest";
    const progTitle = b.items?.[0]?.session?.program?.title || "N/A";
    const totalSeats = (b.items || []).reduce(
      (sum, i) => sum + (i.quantity || 1),
      0
    );

    const totalAmt = Number(b.amount || 0).toFixed(2);
    const balAmt = Number(b.balance || 0).toFixed(2);
    const paidAmt = Math.max(0, Number(b.amount || 0) - Number(b.balance || 0)).toFixed(2);

    return [
      b.payment?.orderId || `RV-${b.id}`,
      formatDate(b.bookedDate),
      guestName,
      progTitle,
      String(totalSeats),
      b.status || "PENDING",
      `$${totalAmt}`,
      `$${paidAmt}`,
      `$${balAmt}`,
      b.leader?.role === "LEADER" ? (b.leader?.name || "Travel Agent") : "Direct",
    ];
  });

  autoTable(doc, {
    startY: 142,
    head: [
      [
        "Ref #",
        "Date",
        "Guest",
        "Program",
        "Seats",
        "Status",
        "Total",
        "Paid",
        "Balance",
        "Agent/Referral",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [45, 74, 34],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [55, 65, 81],
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 55 },
      2: { cellWidth: 95 },
      3: { cellWidth: 110 },
      4: { cellWidth: 35, halign: "center" },
      5: { cellWidth: 65, halign: "center" },
      6: { cellWidth: 55, halign: "right" },
      7: { cellWidth: 55, halign: "right" },
      8: { cellWidth: 55, halign: "right" },
      9: { cellWidth: 110 },
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(str, 842 - 50, 580);
      doc.text("The Ceylon Tea Experience - Confidential Internal Report", 36, 580);
    },
  });

  const fileDate = new Date().toISOString().split("T")[0];
  doc.save(`bookings_report_${fileDate}.pdf`);
}

export function downloadBookingsDoc(bookings, stats = {}, filterSummary = {}) {
  const timestamp = new Date().toLocaleString();
  const fileDate = new Date().toISOString().split("T")[0];

  const rowsHtml = bookings
    .map((b) => {
      const firstCust = b.items?.find((i) => i.customer?.name)?.customer;
      const guestName = firstCust?.name || b.leader?.name || "Direct Guest";
      const guestEmail = firstCust?.email || b.leader?.email || "N/A";
      const progTitle = b.items?.[0]?.session?.program?.title || "N/A";
      const activities = (b.items || [])
        .map((i) => i.session?.name)
        .filter(Boolean)
        .join(", ");
      const totalSeats = (b.items || []).reduce(
        (sum, i) => sum + (i.quantity || 1),
        0
      );

      const totalAmt = Number(b.amount || 0).toFixed(2);
      const balAmt = Number(b.balance || 0).toFixed(2);
      const paidAmt = Math.max(0, Number(b.amount || 0) - Number(b.balance || 0)).toFixed(2);

      return `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;"><strong>${b.payment?.orderId || `RV-${b.id}`}</strong></td>
        <td style="padding:6px;border:1px solid #ddd;">${formatDate(b.bookedDate)}</td>
        <td style="padding:6px;border:1px solid #ddd;">${guestName}<br/><span style="font-size:11px;color:#666;">${guestEmail}</span></td>
        <td style="padding:6px;border:1px solid #ddd;">${progTitle}<br/><span style="font-size:11px;color:#666;">${activities}</span></td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;">${totalSeats}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;">${b.status || "PENDING"}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;">$${totalAmt}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;color:#059669;">$${paidAmt}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;color:#dc2626;">$${balAmt}</td>
        <td style="padding:6px;border:1px solid #ddd;">${b.leader?.name || "Direct"}</td>
      </tr>
    `;
    })
    .join("");

  const docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Bookings Report</title>
      <style>
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 20px; color: #333; }
        .header { background: #2d4a22; color: #fff; padding: 18px; border-radius: 6px; }
        .meta { margin: 15px 0; padding: 10px; background: #f4f4f4; border-radius: 4px; font-size: 13px; }
        .metrics { display: flex; margin: 15px 0; }
        .card { padding: 10px 15px; background: #fafafa; border: 1px solid #eee; margin-right: 15px; border-radius: 4px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; margin-top: 15px; }
        th { background: #2d4a22; color: #ffffff; padding: 8px; border: 1px solid #ddd; text-align: left; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin:0;font-size:20px;">THE CEYLON TEA EXPERIENCE</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">Bookings & Reservations Report</p>
      </div>
      <div class="meta">
        <strong>Generated:</strong> ${timestamp} | <strong>Total Records:</strong> ${bookings.length} |
        <strong>Date Range:</strong> ${filterSummary.timeRange || "All"}
      </div>
      <table style="width:100%;margin-bottom:15px;">
        <tr>
          <td style="padding:10px;background:#ecfdf5;border:1px solid #a7f3d0;font-weight:bold;">Total Revenue: ${formatCurrency(stats.totalRevenue)}</td>
          <td style="padding:10px;background:#eff6ff;border:1px solid #bfdbfe;font-weight:bold;">Total Collected: ${formatCurrency(stats.totalCollected)}</td>
          <td style="padding:10px;background:#fffbeb;border:1px solid #fde68a;font-weight:bold;">Pending Balance: ${formatCurrency(stats.totalBalance)}</td>
          <td style="padding:10px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:bold;">Total Guests: ${stats.totalGuests || 0}</td>
        </tr>
      </table>
      <table>
        <thead>
          <tr>
            <th>Ref #</th>
            <th>Date</th>
            <th>Guest</th>
            <th>Program & Activities</th>
            <th>Seats</th>
            <th>Status</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Agent</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || "<tr><td colspan='10' style='text-align:center;padding:15px;'>No bookings found.</td></tr>"}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF" + docContent], {
    type: "application/msword;charset=utf-8",
  });
  downloadBlob(blob, `bookings_report_${fileDate}.doc`);
}

/**
 * ============================================================================
 * AGENTS / AFFILIATES EXPORTS
 * ============================================================================
 */

export function downloadAgentsCSV(agents, filterSummary = {}) {
  const headers = [
    "Agent ID",
    "Agent Name",
    "Email",
    "Contact Phone",
    "Affiliation Promo Code",
    "Role",
    "Status",
    "Clients Brought In",
    "Bookings Generated",
    "Total Seats Referred",
    "Total Commission ($)",
    "Paid Commission ($)",
    "Pending Commission ($)",
  ];

  const rows = agents.map((a) => [
    a.id,
    a.name,
    a.email,
    a.contact || "N/A",
    a.promoteCode || "None",
    a.role || "LEADER",
    a.status || "ACTIVE",
    a.customersCount ?? a.totalCustomers ?? 0,
    a.bookingsCount ?? a.totalBookings ?? 0,
    a.totalSeatsReferred ?? 0,
    Number(a.totalCommission || 0).toFixed(2),
    Number(a.paidCommission || 0).toFixed(2),
    Number(a.pendingCommission || 0).toFixed(2),
  ]);

  const csvRows = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  const csvBlob = new Blob(["\uFEFF" + csvRows.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const timestamp = new Date().toISOString().split("T")[0];
  downloadBlob(csvBlob, `travel_agents_report_${timestamp}.csv`);
}

export function downloadAgentsPDF(agents, summaryStats = {}, filterSummary = {}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  // Header Branding
  doc.setFillColor(45, 74, 34); // Brand dark green #2d4a22
  doc.rect(0, 0, 842, 60, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("THE CEYLON TEA EXPERIENCE", 36, 32);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Travel Agents & Affiliates Performance Report", 36, 48);

  const timestamp = new Date().toLocaleString();
  doc.setFontSize(9);
  doc.text(`Generated: ${timestamp}`, 680, 38);

  // Summary Metrics Bar
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(36, 76, 770, 36, 4, 4, "F");

  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");

  const totalAgents = agents.length;
  const totalClients = agents.reduce(
    (sum, a) => sum + (a.customersCount ?? a.totalCustomers ?? 0),
    0
  );
  const totalBookings = agents.reduce(
    (sum, a) => sum + (a.bookingsCount ?? a.totalBookings ?? 0),
    0
  );
  const totalComms = agents.reduce(
    (sum, a) => sum + Number(a.totalCommission || 0),
    0
  );

  doc.text(`Total Registered Agents: ${totalAgents}`, 50, 98);
  doc.text(`Clients Brought In: ${totalClients}`, 250, 98);
  doc.text(`Total Bookings: ${totalBookings}`, 450, 98);
  doc.text(`Total Commission: ${formatCurrency(totalComms)}`, 640, 98);

  // Table Data
  const tableData = agents.map((a) => [
    a.name,
    `${a.email}\n${a.contact || "No Phone"}`,
    a.promoteCode || "None",
    a.status || "ACTIVE",
    String(a.customersCount ?? a.totalCustomers ?? 0),
    String(a.bookingsCount ?? a.totalBookings ?? 0),
    String(a.totalSeatsReferred ?? 0),
    `$${Number(a.totalCommission || 0).toFixed(2)}`,
    `$${Number(a.paidCommission || 0).toFixed(2)}`,
    `$${Number(a.pendingCommission || 0).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 124,
    head: [
      [
        "Agent Name",
        "Email & Contact",
        "Affiliation Code",
        "Status",
        "Clients Brought",
        "Bookings",
        "Seats",
        "Total Comm.",
        "Paid",
        "Pending",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [45, 74, 34],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [55, 65, 81],
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 150 },
      2: { cellWidth: 80, halign: "center" },
      3: { cellWidth: 60, halign: "center" },
      4: { cellWidth: 65, halign: "center" },
      5: { cellWidth: 55, halign: "center" },
      6: { cellWidth: 45, halign: "center" },
      7: { cellWidth: 70, halign: "right" },
      8: { cellWidth: 70, halign: "right" },
      9: { cellWidth: 70, halign: "right" },
    },
    didDrawPage: () => {
      const str = `Page ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(str, 842 - 50, 580);
      doc.text("The Ceylon Tea Experience - Travel Agent Affiliation Report", 36, 580);
    },
  });

  const fileDate = new Date().toISOString().split("T")[0];
  doc.save(`travel_agents_report_${fileDate}.pdf`);
}

export function downloadAgentsDoc(agents, summaryStats = {}, filterSummary = {}) {
  const timestamp = new Date().toLocaleString();
  const fileDate = new Date().toISOString().split("T")[0];

  const totalAgents = agents.length;
  const totalClients = agents.reduce(
    (sum, a) => sum + (a.customersCount ?? a.totalCustomers ?? 0),
    0
  );
  const totalBookings = agents.reduce(
    (sum, a) => sum + (a.bookingsCount ?? a.totalBookings ?? 0),
    0
  );
  const totalComms = agents.reduce(
    (sum, a) => sum + Number(a.totalCommission || 0),
    0
  );

  const rowsHtml = agents
    .map(
      (a) => `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;"><strong>${a.name}</strong></td>
        <td style="padding:6px;border:1px solid #ddd;">${a.email}<br/><span style="font-size:11px;color:#666;">${a.contact || "N/A"}</span></td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;"><strong>${a.promoteCode || "None"}</strong></td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;">${a.status || "ACTIVE"}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;font-weight:bold;color:#2563eb;">${a.customersCount ?? a.totalCustomers ?? 0}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;">${a.bookingsCount ?? a.totalBookings ?? 0}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;">${a.totalSeatsReferred ?? 0}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;font-weight:bold;">$${Number(a.totalCommission || 0).toFixed(2)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;color:#059669;">$${Number(a.paidCommission || 0).toFixed(2)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;color:#d97706;">$${Number(a.pendingCommission || 0).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  const docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Travel Agents & Affiliates Report</title>
      <style>
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 20px; color: #333; }
        .header { background: #2d4a22; color: #fff; padding: 18px; border-radius: 6px; }
        .meta { margin: 15px 0; padding: 10px; background: #f4f4f4; border-radius: 4px; font-size: 13px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; margin-top: 15px; }
        th { background: #2d4a22; color: #ffffff; padding: 8px; border: 1px solid #ddd; text-align: left; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin:0;font-size:20px;">THE CEYLON TEA EXPERIENCE</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">Travel Agents & Affiliates Performance Report</p>
      </div>
      <div class="meta">
        <strong>Generated:</strong> ${timestamp} | <strong>Total Agents:</strong> ${totalAgents}
      </div>
      <table style="width:100%;margin-bottom:15px;">
        <tr>
          <td style="padding:10px;background:#ecfdf5;border:1px solid #a7f3d0;font-weight:bold;">Active Agents: ${totalAgents}</td>
          <td style="padding:10px;background:#eff6ff;border:1px solid #bfdbfe;font-weight:bold;">Clients Brought: ${totalClients}</td>
          <td style="padding:10px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:bold;">Total Bookings: ${totalBookings}</td>
          <td style="padding:10px;background:#fffbeb;border:1px solid #fde68a;font-weight:bold;">Total Commission: ${formatCurrency(totalComms)}</td>
        </tr>
      </table>
      <table>
        <thead>
          <tr>
            <th>Agent Name</th>
            <th>Email & Contact</th>
            <th>Affiliation Code</th>
            <th>Status</th>
            <th>Clients Brought</th>
            <th>Bookings</th>
            <th>Seats</th>
            <th>Total Commission</th>
            <th>Paid</th>
            <th>Pending</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || "<tr><td colspan='10' style='text-align:center;padding:15px;'>No agents found.</td></tr>"}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF" + docContent], {
    type: "application/msword;charset=utf-8",
  });
  downloadBlob(blob, `travel_agents_report_${fileDate}.doc`);
}

/**
 * ============================================================================
 * SINGLE CUSTOMER BOOKING VOUCHER PDF
 * ============================================================================
 */

function formatSessionTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours || 12;
  return `${hours}:${minutes} ${ampm}`;
}

export function downloadSingleBookingPDF(booking) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = 595;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(45, 74, 34); // Brand dark green #2d4a22
  doc.rect(0, 0, pageWidth, 68, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text("THE CEYLON TEA EXPERIENCE", margin, 32);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Official Booking Voucher & Reservation Pass", margin, 50);

  // 1. BOOKING REFERENCE (Item 18 #1)
  const refCode = String(booking.referenceCode || `RV-${booking.bookingId || "001"}`);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 200, 14, 164, 42, 4, 4, "F");

  doc.setTextColor(45, 74, 34);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("BOOKING REFERENCE", pageWidth - 190, 28);

  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text(refCode, pageWidth - 190, 46);

  let currentY = 82;

  // 2. GUEST DETAILS (Item 18 #2)
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, currentY, contentWidth, 68, 5, 5, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(45, 74, 34);
  doc.text("GUEST DETAILS", margin + 14, currentY + 18);

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "bold");
  doc.text("Primary Guest:", margin + 14, currentY + 36);
  doc.text("WhatsApp / Contact:", margin + 14, currentY + 54);

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  doc.text(String(booking.guestName || "Guest"), margin + 120, currentY + 36);
  doc.text(String(booking.guestPhone || "N/A"), margin + 120, currentY + 54);

  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "bold");
  doc.text("Email Address:", margin + 280, currentY + 36);
  doc.text("Total Attendees:", margin + 280, currentY + 54);

  const totalSeats = (booking.items || []).reduce((sum, i) => sum + (i.seats || 1), 0);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  doc.text(String(booking.guestEmail || "N/A"), margin + 375, currentY + 36);
  doc.text(`${totalSeats} ${totalSeats === 1 ? "Guest" : "Guests"}`, margin + 375, currentY + 54);

  currentY += 78;

  // 3. LOCATION & DATE (Item 18 #3)
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, currentY, contentWidth, 54, 5, 5, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(45, 74, 34);
  doc.text("EXPERIENCE LOCATION & DATE", margin + 14, currentY + 18);

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "bold");
  doc.text("Location:", margin + 14, currentY + 38);
  doc.text("Experience Date:", margin + 280, currentY + 38);

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  doc.text(String(booking.location || "Ceylon Tea Estate, Sri Lanka"), margin + 70, currentY + 38);

  const bookedDateFormatted = booking.bookedDate
    ? new Date(booking.bookedDate).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Scheduled Date";
  doc.setFont("helvetica", "bold");
  doc.text(bookedDateFormatted, margin + 375, currentY + 38);

  currentY += 66;

  // 4. SESSIONS & ACTIVITIES (grouped by session, in time order) (Item 18 #4)
  // Deduplicate and sort sessions chronologically by startTime
  const sessionItemMap = new Map();
  (booking.items || []).forEach((item) => {
    const key = item.sessionId ? String(item.sessionId) : (item.sessionName || "activity");
    if (!sessionItemMap.has(key)) {
      sessionItemMap.set(key, {
        name: item.sessionName || "Activity Session",
        startTime: item.startTime,
        endTime: item.endTime,
        seats: item.seats || 1,
        programTitle: item.programTitle || booking.programTitle || "Tea Experience",
      });
    } else {
      const existing = sessionItemMap.get(key);
      existing.seats += item.seats || 1;
    }
  });

  const sortedSessions = Array.from(sessionItemMap.values()).sort((a, b) => {
    const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
    const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
    return timeA - timeB;
  });

  const sessionTableRows = sortedSessions.map((s, idx) => {
    let timeStr = "Scheduled Time";
    if (s.startTime && s.endTime) {
      timeStr = `${formatSessionTime(s.startTime)} - ${formatSessionTime(s.endTime)}`;
    } else if (s.startTime) {
      timeStr = formatSessionTime(s.startTime);
    }
    return [
      String(idx + 1),
      s.name,
      s.programTitle,
      timeStr,
      `${s.seats} ${s.seats === 1 ? "seat" : "seats"}`
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["#", "Session / Activity (In Time Order)", "Program", "Scheduled Time", "Seats"]],
    body: sessionTableRows.length > 0 ? sessionTableRows : [["1", "Standard Experience Session", "Ceylon Tea", "Scheduled Time", "1 seat"]],
    theme: "striped",
    headStyles: {
      fillColor: [45, 74, 34],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [55, 65, 81],
    },
    columnStyles: {
      0: { cellWidth: 25, halign: "center" },
      1: { cellWidth: 175 },
      2: { cellWidth: 140 },
      3: { cellWidth: 115 },
      4: { cellWidth: 68, halign: "center" },
    },
  });

  currentY = (doc.lastAutoTable?.finalY || currentY + 60) + 14;

  // 5. TICKETS / ADD-ONS (Item 18 #5)
  const ticketRows = [];
  (booking.items || []).forEach((item) => {
    if (item.sessionTypeName) {
      ticketRows.push([
        item.sessionName || "Session Activity",
        item.sessionTypeName,
        `${item.seats || 1} ${item.seats === 1 ? "ticket" : "tickets"}`
      ]);
    }
  });

  if (ticketRows.length === 0) {
    ticketRows.push(["All Booked Sessions", "Standard Program Admission", `${totalSeats} tickets`]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [["Session", "Selected Ticket / Add-on Option", "Seats / Quantity"]],
    body: ticketRows,
    theme: "striped",
    headStyles: {
      fillColor: [60, 95, 45],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [55, 65, 81],
    },
    columnStyles: {
      0: { cellWidth: 200 },
      1: { cellWidth: 220 },
      2: { cellWidth: 103, halign: "center" },
    },
  });

  currentY = (doc.lastAutoTable?.finalY || currentY + 50) + 14;

  // Check if we need space for Payment Summary & Policies (prevent bad page break)
  if (currentY > 640) {
    doc.addPage();
    currentY = 40;
  }

  // 6. PAYMENT SUMMARY / TOTAL (Item 18 #6) & 7. PAYMENT TYPE (Item 18 #7)
  const paymentBoxHeight = 84;
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, currentY, contentWidth, paymentBoxHeight, 5, 5, "FD");

  // Left column: Payment Type & Method (Item 18 #7)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(45, 74, 34);
  doc.text("PAYMENT INFORMATION", margin + 14, currentY + 18);

  const paymentMethodLabel =
    booking.paymentMethod ||
    (booking.paymentType === "Later"
      ? "Pay Later (Pay on Arrival)"
      : booking.paymentType === "Partial"
      ? "Partial Payment"
      : "Full Payment");

  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Type:", margin + 14, currentY + 36);
  doc.text("Payment Method:", margin + 14, currentY + 52);
  doc.text("Payment Status:", margin + 14, currentY + 68);

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  doc.text(String(booking.paymentType || "Full"), margin + 105, currentY + 36);
  doc.text(paymentMethodLabel, margin + 105, currentY + 52);

  const isFullyPaid = Number(booking.balance || 0) === 0 && Number(booking.paidAmount || 0) > 0;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isFullyPaid ? 5 : 180, isFullyPaid ? 150 : 83, isFullyPaid ? 105 : 9);
  doc.text(isFullyPaid ? "PAID IN FULL" : booking.paymentType === "Later" ? "PAY ON ARRIVAL" : "PARTIALLY PAID", margin + 105, currentY + 68);

  // Right column: Payment Summary / Total (Item 18 #6)
  const rightColX = margin + 300;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(45, 74, 34);
  doc.text("PAYMENT SUMMARY", rightColX, currentY + 18);

  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "bold");
  doc.text("Total Experience Price:", rightColX, currentY + 36);
  doc.text("Amount Paid:", rightColX, currentY + 52);
  doc.text("Balance Due on Arrival:", rightColX, currentY + 68);

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.text(`$${Number(booking.totalPrice || 0).toFixed(2)}`, rightColX + 130, currentY + 36);

  doc.setTextColor(5, 150, 105);
  doc.text(`$${Number(booking.paidAmount || 0).toFixed(2)}`, rightColX + 130, currentY + 52);

  doc.setTextColor(180, 83, 9);
  doc.text(`$${Number(booking.balance || 0).toFixed(2)}`, rightColX + 130, currentY + 68);

  currentY += paymentBoxHeight + 14;

  // 8. POLICIES & FOOTER (Item 18 #8)
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(55, 65, 81);
  doc.text("IMPORTANT VISITOR POLICIES & GUIDELINES:", margin, currentY + 14);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.text("• Please arrive 15 minutes before your scheduled session start time at the estate reception.", margin, currentY + 26);
  doc.text("• Present this voucher (printed or digital on your mobile device) along with your booking reference.", margin, currentY + 38);
  doc.text("• Closed walking shoes and comfortable attire are recommended for tea garden trails.", margin, currentY + 50);
  doc.text("• Rescheduling & Customer Support: (+94) 70 290 0500  |  info@ceylonteaexperience.com", margin, currentY + 62);

  // Bottom brand footer
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text(
    "The Ceylon Tea Experience • Hill Country, Sri Lanka • Official Confirmation Voucher • www.ceylonteaexperience.com",
    margin,
    810
  );

  const cleanRef = String(
    booking.referenceCode || booking.bookingId || "voucher"
  ).replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`CeylonTeaExperience_${cleanRef}.pdf`);
}

/**
 * ============================================================================
 * CLIENTS / GUESTS DIRECTORY EXPORTS
 * ============================================================================
 */

export function downloadClientsCSV(clients, filterSummary = {}) {
  const headers = [
    "Client ID",
    "Full Name",
    "Email",
    "Phone",
    "NIC / Passport",
    "Registered Date",
    "Affiliated Travel Agent",
    "Agent Promo Code",
    "Attended Program",
    "Total Sessions",
    "Last Session Date",
    "Status",
  ];

  const rows = clients.map((c) => [
    c.id,
    c.name,
    c.email,
    c.phone || "N/A",
    c.nic || "N/A",
    formatDate(c.createdAt),
    c.leaderName || "Direct",
    c.leaderPromoteCode || "None",
    c.programTitle || "N/A",
    c.sessionsCount || 0,
    formatDate(c.lastSessionDate),
    c.status || "Active",
  ]);

  const csvRows = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  const csvBlob = new Blob(["\uFEFF" + csvRows.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const timestamp = new Date().toISOString().split("T")[0];
  downloadBlob(csvBlob, `clients_guests_report_${timestamp}.csv`);
}

export function downloadClientsPDF(clients, summaryStats = {}, filterSummary = {}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  // Header Banner
  doc.setFillColor(45, 74, 34); // Brand dark green #2d4a22
  doc.rect(0, 0, 842, 60, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("THE CEYLON TEA EXPERIENCE", 36, 32);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Clients & Guests Directory Report", 36, 48);

  const timestamp = new Date().toLocaleString();
  doc.setFontSize(9);
  doc.text(`Generated: ${timestamp}`, 680, 38);

  // Summary Metrics Bar
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(36, 76, 770, 36, 4, 4, "F");

  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");

  const totalClients = clients.length;
  const activeCount = clients.filter(
    (c) => c.status === "Active" || c.status === "Upcoming"
  ).length;
  const totalSessions = clients.reduce(
    (sum, c) => sum + (c.sessionsCount || 0),
    0
  );
  const agentReferred = clients.filter(
    (c) => c.leaderRole === "LEADER" || (c.leaderPromoteCode && c.leaderPromoteCode !== "None")
  ).length;

  doc.text(`Total Clients: ${totalClients}`, 50, 98);
  doc.text(`Active / Upcoming: ${activeCount}`, 240, 98);
  doc.text(`From Travel Agents: ${agentReferred}`, 440, 98);
  doc.text(`Total Sessions Booked: ${totalSessions}`, 640, 98);

  // Table Data
  const tableData = clients.map((c) => [
    c.name,
    `${c.email}\n${c.phone || "No Phone"}`,
    c.nic || "N/A",
    c.leaderName || "Direct",
    c.leaderPromoteCode || "None",
    c.programTitle || "N/A",
    String(c.sessionsCount || 0),
    formatDate(c.lastSessionDate),
    c.status || "Active",
  ]);

  autoTable(doc, {
    startY: 124,
    head: [
      [
        "Client Name",
        "Email & Contact",
        "NIC / Passport",
        "Affiliated Agent",
        "Promo Code",
        "Program",
        "Sessions",
        "Last Session",
        "Status",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [45, 74, 34],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 5.5,
      textColor: [55, 65, 81],
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 105 },
      1: { cellWidth: 145 },
      2: { cellWidth: 75 },
      3: { cellWidth: 100 },
      4: { cellWidth: 65, halign: "center" },
      5: { cellWidth: 100 },
      6: { cellWidth: 50, halign: "center" },
      7: { cellWidth: 65 },
      8: { cellWidth: 65, halign: "center" },
    },
    didDrawPage: () => {
      const str = `Page ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(str, 842 - 50, 580);
      doc.text("The Ceylon Tea Experience - Client Relationship Directory", 36, 580);
    },
  });

  const fileDate = new Date().toISOString().split("T")[0];
  doc.save(`clients_report_${fileDate}.pdf`);
}

export function downloadClientsDoc(clients, summaryStats = {}, filterSummary = {}) {
  const timestamp = new Date().toLocaleString();
  const fileDate = new Date().toISOString().split("T")[0];

  const totalClients = clients.length;
  const activeCount = clients.filter(
    (c) => c.status === "Active" || c.status === "Upcoming"
  ).length;
  const totalSessions = clients.reduce(
    (sum, c) => sum + (c.sessionsCount || 0),
    0
  );
  const agentReferred = clients.filter(
    (c) => c.leaderRole === "LEADER" || (c.leaderPromoteCode && c.leaderPromoteCode !== "None")
  ).length;

  const rowsHtml = clients
    .map(
      (c) => `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;"><strong>${c.name}</strong></td>
        <td style="padding:6px;border:1px solid #ddd;">${c.email}<br/><span style="font-size:11px;color:#666;">${c.phone || "N/A"}</span></td>
        <td style="padding:6px;border:1px solid #ddd;">${c.nic || "N/A"}</td>
        <td style="padding:6px;border:1px solid #ddd;">${c.leaderName || "Direct"}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;">${c.leaderPromoteCode || "None"}</td>
        <td style="padding:6px;border:1px solid #ddd;">${c.programTitle || "N/A"}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;">${c.sessionsCount || 0}</td>
        <td style="padding:6px;border:1px solid #ddd;">${formatDate(c.lastSessionDate)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;">${c.status || "Active"}</td>
      </tr>
    `
    )
    .join("");

  const docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Clients & Guests Report</title>
      <style>
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 20px; color: #333; }
        .header { background: #2d4a22; color: #fff; padding: 18px; border-radius: 6px; }
        .meta { margin: 15px 0; padding: 10px; background: #f4f4f4; border-radius: 4px; font-size: 13px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; margin-top: 15px; }
        th { background: #2d4a22; color: #ffffff; padding: 8px; border: 1px solid #ddd; text-align: left; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin:0;font-size:20px;">THE CEYLON TEA EXPERIENCE</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">Clients & Guests Directory Report</p>
      </div>
      <div class="meta">
        <strong>Generated:</strong> ${timestamp} | <strong>Total Clients:</strong> ${totalClients}
      </div>
      <table style="width:100%;margin-bottom:15px;">
        <tr>
          <td style="padding:10px;background:#ecfdf5;border:1px solid #a7f3d0;font-weight:bold;">Total Clients: ${totalClients}</td>
          <td style="padding:10px;background:#eff6ff;border:1px solid #bfdbfe;font-weight:bold;">Active / Upcoming: ${activeCount}</td>
          <td style="padding:10px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:bold;">Referred by Agents: ${agentReferred}</td>
          <td style="padding:10px;background:#fffbeb;border:1px solid #fde68a;font-weight:bold;">Total Sessions: ${totalSessions}</td>
        </tr>
      </table>
      <table>
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Email & Contact</th>
            <th>NIC / Passport</th>
            <th>Affiliated Agent</th>
            <th>Promo Code</th>
            <th>Program</th>
            <th>Sessions</th>
            <th>Last Session</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || "<tr><td colspan='9' style='text-align:center;padding:15px;'>No clients found.</td></tr>"}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF" + docContent], {
    type: "application/msword;charset=utf-8",
  });
  downloadBlob(blob, `clients_report_${fileDate}.doc`);
}

import nodemailer from 'nodemailer';

/**
 * Formats a DB time or ISO string into 12-hour AM/PM format (e.g., "09:00 AM")
 */
function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours || 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats a Date object or string into a readable date (e.g., "Fri, Sep 25, 2026")
 */
function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Creates and returns an SMTP nodemailer transporter based on environment variables.
 * Falls back to an Ethereal test account in non-production if no credentials are provided.
 */
async function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '');

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  }

  // Fallback for development/testing if no SMTP host is configured
  console.warn('[Email Utility] No SMTP credentials provided in environment. Creating test account via Ethereal...');
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

/**
 * Sends a booking confirmation email to the user with selected programs, sessions, times, and payment details.
 * 
 * @param {Object} booking - The created booking details.
 */
export async function sendBookingConfirmation(booking) {
  try {
    const transporter = await getTransporter();

    const fromEmail = process.env.SMTP_FROM_EMAIL || '"The Ceylon Tea Experience" <tcte.galle@gmail.com>';
    const toEmail = booking.email;

    if (!toEmail) {
      console.warn('[Email Utility] Booking does not contain a recipient email address. Skipping email.');
      return;
    }

    const currency = booking.currency || 'USD';
    const totalPriceFormatted = Number(booking.totalPrice || 0).toFixed(2);
    const paidAmountFormatted = Number(booking.paidAmount || 0).toFixed(2);
    const balanceDueFormatted = Number(
      booking.balance ?? (booking.totalPrice - (booking.paidAmount || 0))
    ).toFixed(2);

    const bookingDateStr = formatDate(booking.date || booking.checkInDate);

    // Build items HTML table rows
    const itemsRows = (booking.items || [])
      .map((item) => {
        let timeDisplay = 'Scheduled Time';
        if (item.startTime && item.endTime) {
          timeDisplay = `${formatTime(item.startTime)} - ${formatTime(item.endTime)}`;
        } else if (item.startTime) {
          timeDisplay = formatTime(item.startTime);
        }

        const progBadge = item.programTitle
          ? `<div style="font-size: 12px; color: #2d4a22; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Program: ${item.programTitle}</div>`
          : '';
        const optionBadge = item.sessionTypeName
          ? `<div style="font-size: 13px; color: #4b5563; margin-top: 3px;">Activity: <strong style="color: #2d4a22;">${item.sessionTypeName}</strong></div>`
          : `<div style="font-size: 13px; color: #6b7280; margin-top: 3px;">Activity: <span style="color: #374151;">Standard Activity</span></div>`;

        return `
          <tr>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
              ${progBadge}
              <div style="font-size: 14px; color: #1f2937;"><strong style="color: #111827;">Session:</strong> ${item.sessionName}</div>
              ${optionBadge}
            </td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px; vertical-align: top; white-space: nowrap;">
              <span style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-weight: 500;">${timeDisplay}</span>
            </td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151; font-size: 14px; vertical-align: top; font-weight: 600;">
              ${item.seats || 1}
            </td>
          </tr>
        `;
      })
      .join('');

    const paymentMethodLabel =
      booking.paymentMethod ||
      (booking.paymentType === 'Later'
        ? 'Pay Later (Pay on Arrival)'
        : booking.paymentType === 'Partial'
        ? 'Partial Payment'
        : 'Full Payment');

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2d4a22 0%, #1c3214 100%); color: #ffffff; padding: 28px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.8px;">THE CEYLON TEA EXPERIENCE</h1>
          <p style="margin: 6px 0 0; font-size: 14px; color: #d1fae5; font-weight: 400;">Official Booking Confirmation</p>
        </div>

        <div style="padding: 24px 28px;">
          <p style="font-size: 16px; color: #1f2937; margin: 0 0 12px;">
            Dear <strong>${booking.firstName || 'Valued Guest'} ${booking.lastName || ''}</strong>,
          </p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 22px;">
            Thank you for booking with us! We are pleased to confirm your reservation. Please find your booking and session details below:
          </p>

          <!-- Overview Card -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; width: 40%;"><strong>Booking Reference:</strong></td>
                <td style="padding: 6px 0; color: #111827; font-weight: 600;">${booking.bookingNumber || booking.id}</td>
              </tr>
              ${booking.programTitle ? `
              <tr>
                <td style="padding: 6px 0; color: #6b7280;"><strong>Program:</strong></td>
                <td style="padding: 6px 0; color: #111827; font-weight: 600;">${booking.programTitle}</td>
              </tr>` : ''}
              ${booking.location ? `
              <tr>
                <td style="padding: 6px 0; color: #6b7280;"><strong>Location:</strong></td>
                <td style="padding: 6px 0; color: #111827;">${booking.location}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #6b7280;"><strong>Date:</strong></td>
                <td style="padding: 6px 0; color: #111827; font-weight: 600;">${bookingDateStr}</td>
              </tr>
            </table>
          </div>

          <!-- Activities & Time Table -->
          <h3 style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;">
            Selected Sessions & Schedule
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f3f4f6; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">
                <th style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">Activity / Session</th>
                <th style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">Time</th>
                <th style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: center;">Seats</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows || `
                <tr>
                  <td colspan="3" style="padding: 14px; text-align: center; color: #6b7280; font-size: 14px;">
                    All scheduled program activities
                  </td>
                </tr>
              `}
            </tbody>
          </table>

          <!-- Payment Summary -->
          <h3 style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;">
            Payment Summary
          </h3>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Payment Method:</td>
                <td style="padding: 6px 0; text-align: right; color: #111827; font-weight: 600;">${paymentMethodLabel}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Total Price:</td>
                <td style="padding: 6px 0; text-align: right; color: #111827; font-weight: 600;">${currency} ${totalPriceFormatted}</td>
              </tr>
              <tr style="color: #059669;">
                <td style="padding: 6px 0; font-weight: 600;">Paid Amount:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600;">${currency} ${paidAmountFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0 0; color: #6b7280; border-top: 1px dashed #d1d5db;">Balance Due:</td>
                <td style="padding: 8px 0 0; text-align: right; color: #111827; font-weight: 600; border-top: 1px dashed #d1d5db;">${currency} ${balanceDueFormatted}</td>
              </tr>
            </table>
          </div>

          <!-- Notes -->
          <p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0 0 20px;">
            Please arrive at the venue 15 minutes before your first session begins. If you need any assistance or have questions regarding your booking, contact us at 
            <a href="tel:+94702900500" style="color: #2d4a22; font-weight: 600; text-decoration: none;">(+94) 70 290 0500</a> or reply directly to this email.
          </p>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">The Ceylon Tea Experience</p>
            <p style="margin: 4px 0 0; font-size: 12px; color: #9ca3af;">Hill Country, Sri Lanka</p>
          </div>
        </div>
      </div>
    `;

    // Plain text summary fallback
    const itemsText = (booking.items || [])
      .map(
        (item) =>
          `- ${item.sessionName} (${item.sessionTypeName ? item.sessionTypeName + ' | ' : ''}${
            item.startTime && item.endTime ? `${formatTime(item.startTime)} - ${formatTime(item.endTime)}` : 'Scheduled Time'
          }) - ${item.seats || 1} seat(s)`
      )
      .join('\n');

    const plainText = `
Booking Confirmation - The Ceylon Tea Experience
Reference: ${booking.bookingNumber || booking.id}
Date: ${bookingDateStr}
Program: ${booking.programTitle || 'Tea Experience'}
Location: ${booking.location || 'Sri Lanka'}

Activities & Times:
${itemsText || '- All scheduled program activities'}

Payment:
Payment Method: ${paymentMethodLabel}
Total Price: ${currency} ${totalPriceFormatted}
Paid Amount: ${currency} ${paidAmountFormatted}
Balance Due: ${currency} ${balanceDueFormatted}

For assistance, contact (+94) 70 290 0500.
    `.trim();

    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: `Booking Confirmation - ${booking.programTitle || 'The Ceylon Tea Experience'} (${booking.bookingNumber || booking.id})`,
      text: plainText,
      html: htmlContent,
    });

    console.log('[Email Utility] Email sent successfully: %s', info.messageId);

    if (nodemailer.getTestMessageUrl(info)) {
      console.log('[Email Utility] Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('[Email Utility] Failed to send booking email:', error);
  }
}

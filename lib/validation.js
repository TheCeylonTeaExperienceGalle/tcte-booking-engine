/**
 * Shared Form Validation Helper for Public & Admin Booking Forms
 * Ensures consistent validation rules, single message per field,
 * required text for ID/Passport (no regex check), and WhatsApp phone validation.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_LOCAL_REGEX = /^(?:\+94|0)7[0-9]{8}$/;
export const PHONE_INTL_REGEX = /^\+[1-9][0-9]{7,14}$/;

/**
 * Validates a single guest/attendee field.
 *
 * @param {string} field - Field name: "name", "email", "phone", "nic" / "idNumber"
 * @param {string} value - Current field value
 * @param {boolean} required - Whether the field is mandatory
 * @returns {string} Error message if invalid, or empty string if valid.
 */
export function validateGuestField(field, value, required = false) {
  const v = (value || "").trim();

  if (!v) {
    if (!required) return "";
    switch (field) {
      case "name":
        return "Name is required";
      case "email":
        return "Email address is required";
      case "phone":
        return "WhatsApp number is required";
      case "nic":
      case "idNumber":
        return "ID / Passport number is required";
      default:
        return "This field is required";
    }
  }

  switch (field) {
    case "name":
      return v.length < 2 ? "Enter a valid name (at least 2 characters)" : "";

    case "idNumber":
    case "nic":
      // ID/Passport: required text only, no format regex check
      return "";

    case "phone":
      // WhatsApp number: required text, no 10-digit format restriction
      return "";

    case "email":
      return EMAIL_REGEX.test(v) ? "" : "Enter a valid email address";

    default:
      return "";
  }
}

/**
 * Malawi numbers: +265 + 9 digits, or 0 + 9 digits (matches backend rules).
 */

export type MalawiPhoneFieldResult = { ok: true } | { ok: false; message: string };

function normalizePhoneInput(input: string): string {
  return input.replace(/\s/g, '').trim();
}

export function isPlausibleMalawiPhone(input: string): boolean {
  const n = normalizePhoneInput(input);
  if (n.length < 10 || n.length > 16) return false;
  if (/^\+265\d{9}$/.test(n)) return true;
  if (/^265\d{9}$/.test(n)) return true;
  if (/^0\d{9}$/.test(n)) return true;
  return false;
}

/**
 * @param fieldLabel - e.g. "Mobile number" or "WhatsApp number"
 */
export function validateMalawiPhoneField(
  raw: string,
  fieldLabel: string
): MalawiPhoneFieldResult {
  const value = normalizePhoneInput(raw);
  if (!value) {
    return {
      ok: false,
      message: `${fieldLabel} is required. Example: +265991234567 or 0991234567 (9 digits after +265 or after 0).`,
    };
  }
  if (!isPlausibleMalawiPhone(value)) {
    return {
      ok: false,
      message: `${fieldLabel} must be a Malawi number: +265 and 9 digits (e.g. +265991234567), or 0 and 9 digits (e.g. 0991234567).`,
    };
  }
  return { ok: true };
}

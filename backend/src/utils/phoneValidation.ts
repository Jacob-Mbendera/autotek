/**
 * Malawi-focused phone checks (+265XXXXXXXXX or 0XXXXXXXXX style).
 */

export function normalizePhoneInput(input: string): string {
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

export function validateQuoteContactPhones(
  mobileRaw: unknown,
  whatsAppRaw: unknown
): { ok: true; mobilePhone: string; whatsAppPhone: string } | { ok: false; message: string } {
  if (typeof mobileRaw !== 'string' || typeof whatsAppRaw !== 'string') {
    return { ok: false, message: 'Mobile number and WhatsApp number are required' };
  }
  const mobilePhone = normalizePhoneInput(mobileRaw);
  const whatsAppPhone = normalizePhoneInput(whatsAppRaw);
  if (!mobilePhone || !whatsAppPhone) {
    return { ok: false, message: 'Mobile number and WhatsApp number are required' };
  }
  if (!isPlausibleMalawiPhone(mobilePhone)) {
    return {
      ok: false,
      message: 'Enter a valid Malawi mobile number (e.g. +265991234567 or 0991234567)',
    };
  }
  if (!isPlausibleMalawiPhone(whatsAppPhone)) {
    return {
      ok: false,
      message: 'Enter a valid WhatsApp number (e.g. +265991234567 or 0991234567)',
    };
  }
  return { ok: true, mobilePhone, whatsAppPhone };
}

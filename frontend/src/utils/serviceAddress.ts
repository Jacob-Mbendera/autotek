import type { ShippingAddress } from '../store/api/orderApi';

/** Same line format as checkout delivery (town + landmark or town + custom). */
export function formatServiceAddressLine(addr: ShippingAddress | null): string {
  if (!addr?.town?.trim()) return '';
  const town = addr.town.trim();
  const landmark = (addr.landmark || '').trim();
  const custom = (addr.customAddress || '').trim();
  if (landmark === 'Other/Custom') {
    return custom ? `${town} - ${custom}` : '';
  }
  return landmark ? `${town}, ${landmark}` : '';
}

export function validateStructuredServiceLocation(
  addr: ShippingAddress | null,
  label: string
): string | null {
  if (!addr?.town?.trim()) {
    return `Select a town for ${label}`;
  }
  if (!addr.landmark?.trim()) {
    return `Select a landmark or area for ${label}`;
  }
  if (addr.landmark === 'Other/Custom' && !addr.customAddress?.trim()) {
    return `Describe your location for ${label}`;
  }
  return null;
}

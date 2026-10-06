import { EMAIL } from '../domain/form';

/** Web Share API with a file (WhatsApp, Messages, Mail…), when the device supports it. */
export function canShareFile(file: File): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export type ShareResult = 'shared' | 'cancelled' | 'unsupported';

export async function shareFile(file: File, title: string): Promise<ShareResult> {
  if (!canShareFile(file)) return 'unsupported';
  try {
    await navigator.share({ files: [file], title });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 30_000);
}

/** wa.me link for a US number (10 digits, or 11 starting with 1). */
export function whatsappUrl(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, '');
  const intl =
    digits.length === 10
      ? `1${digits}`
      : digits.length === 11 && digits.startsWith('1')
        ? digits
        : null;
  if (!intl) return null;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(email: string, subject: string, body: string): string | null {
  const address = email.trim();
  if (!EMAIL.test(address)) return null;
  return `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

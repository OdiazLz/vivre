export function cleanPhoneNumber(phone: string): string {
  if (!phone) {
    return '';
  }

  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  if (cleaned.startsWith('521') && cleaned.length === 13) {
    cleaned = '52' + cleaned.substring(3);
  }

  if (cleaned.length === 10) {
    cleaned = '52' + cleaned;
  }

  if (cleaned.length !== 12 || !cleaned.startsWith('52')) {
    throw new Error(`Número de teléfono inválido: ${phone}`);
  }

  return cleaned;
}
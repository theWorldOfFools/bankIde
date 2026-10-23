const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Jakarta',
});

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${dateTimeFormatter.format(date)} WIB`;
}

export function toWibInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() + WIB_OFFSET_MS);
  return shifted.toISOString().slice(0, 16);
}

export function wibInputToIso(value) {
  if (!value) return null;
  const date = new Date(`${value}:00+07:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function isOverdue(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

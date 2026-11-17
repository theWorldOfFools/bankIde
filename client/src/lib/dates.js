const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Jakarta',
});

const wibDateFormatter = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
});

const wibIsoFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatWibIsoDate(value = new Date()) {
  const parts = wibIsoFormatter.formatToParts(value);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

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

export function todayWibDate() {
  return formatWibIsoDate(new Date());
}

export function formatWibDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return wibDateFormatter.format(date);
}

export function shiftWibDate(value, days) {
  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return formatWibIsoDate(date);
}

/**
 * 日期格式化工具 — 强制使用中国时区 (Asia/Shanghai, UTC+8)
 */

const TZ_OPTIONS: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Shanghai' };

/** 格式化为 YYYY-MM-DD（中国时区） */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleDateString('zh-CN', {
    ...TZ_OPTIONS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
}

/** 格式化为 YYYY-MM-DD HH:mm（中国时区） */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  const date = d.toLocaleDateString('zh-CN', {
    ...TZ_OPTIONS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
  const time = d.toLocaleTimeString('zh-CN', {
    ...TZ_OPTIONS,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date} ${time}`;
}

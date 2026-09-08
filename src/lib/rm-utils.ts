import { toast } from "sonner";

/** Compact date, e.g. "05/09" or "12/03/2027". */
export function formatShortDate(epochMs: number): string {
  const d = new Date(epochMs);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return sameYear
    ? `${dd}/${mm}`
    : `${dd}/${mm}/${d.getFullYear()}`;
}

/** "Hoje, às 14:30" · "Amanhã, às 09:00" · "qui, 18/09 às 10:00" */
export function formatSessionWhen(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayStart = new Date(epochMs);
  dayStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (dayStart.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return `Hoje, às ${hh}:${mi}`;
  if (diffDays === 1) return `Amanhã, às ${hh}:${mi}`;
  const weekday = d
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
  return `${weekday}, ${formatShortDate(epochMs)} às ${hh}:${mi}`;
}

/** "há 3 dias" · "há 2 semanas" · "hoje" */
export function formatDaysAgo(fromEpochMs: number): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - fromEpochMs) / (24 * 60 * 60 * 1000)),
  );
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 14) return `há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (weeks === 2) return "há 2 semanas";
  return `há ${weeks} semanas`;
}

/** "em 3 dias" · "atrasado há 2 dias" */
export function formatDueLabel(dueEpochMs: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueEpochMs);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays < 0)
    return diffDays === -1
      ? "atrasado há 1 dia"
      : `atrasado há ${Math.abs(diffDays)} dias`;
  if (diffDays === 0) return "vence hoje";
  if (diffDays === 1) return "em 1 dia";
  return `em ${diffDays} dias`;
}

/** "Sugestão de retorno: em 12 dias" */
export function formatSuggestedReturn(dueEpochMs: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueEpochMs);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays < 0) return "retorno recomendado: agora";
  return `retorno recomendado: em ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
}

/** Digits-only phone helper for WhatsApp deep links. */
export function whatsappLink(phone: string | undefined, message: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}

/** Copies text and shows a toast; used when a client has no valid phone. */
export async function copyMessage(message: string) {
  try {
    await navigator.clipboard.writeText(message);
    toast.success("Mensagem copiada para a área de transferência.");
  } catch {
    toast.error("Não foi possível copiar a mensagem.");
  }
}

/** Initials for avatar circles ("Camila Lima" → "CL"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A friendly greeting per time of day. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

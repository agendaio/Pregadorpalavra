import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata timestamp em pt-BR curto */
export function formatarData(ts: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ts));
}

export function formatarRelativo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `${min} min atrás`;
  if (h < 24) return `${h} h atrás`;
  if (d < 7) return `${d} d atrás`;
  return formatarData(ts);
}

export function formatarDuracao(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatarRelogio(ts: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

/** Extrai texto puro de HTML para busca e IA */
export function htmlParaTexto(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Trunca string sem cortar palavra */
export function truncar(s: string, max: number): string {
  if (s.length <= max) return s;
  const t = s.slice(0, max);
  const ultimoEspaco = t.lastIndexOf(' ');
  return (ultimoEspaco > 0 ? t.slice(0, ultimoEspaco) : t) + '…';
}
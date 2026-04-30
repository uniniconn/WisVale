import { VERSION } from '../version';

export interface Theme {
  name: string;
  bg: string;
  sidebar: string;
  header: string;
  card: string;
  text: string;
  subText: string;
  navIcon: string;
  border: string;
  input: string;
  primary: string;
  accent: string;
  mutedBg: string;
  mainBg: string;
  buttonSecondary: string;
}

export const THEMES: Record<string, Theme> = {
  day: {
    name: 'Day',
    bg: 'bg-slate-50',
    sidebar: 'bg-white/95 border-r border-slate-200/50',
    header: 'bg-white/95 border-b border-slate-200/50',
    card: 'bg-white/70 border-slate-200/50 hover:border-green-500/30',
    text: 'text-slate-900',
    subText: 'text-slate-500',
    navIcon: 'text-slate-400',
    border: 'border-slate-100',
    input: 'bg-slate-50 border-slate-200 text-slate-900 focus:border-green-500',
    primary: 'bg-green-600 hover:bg-green-700 text-white',
    accent: 'bg-green-600',
    mutedBg: 'bg-slate-50',
    mainBg: 'bg-white/40',
    buttonSecondary: 'bg-slate-100/50 text-slate-600 hover:bg-slate-200/50',
  },
  night: {
    name: 'Night',
    bg: 'bg-slate-950',
    sidebar: 'bg-slate-950/95 border-r border-slate-800/50',
    header: 'bg-slate-950/95 border-b border-slate-800/50',
    card: 'bg-slate-900/40 border-slate-800/50 hover:border-green-500/30',
    text: 'text-slate-50',
    subText: 'text-slate-300',
    navIcon: 'text-slate-400',
    border: 'border-slate-800',
    input: 'bg-slate-900/50 border-slate-800 text-slate-50 focus:border-green-400',
    primary: 'bg-green-500 hover:bg-green-600 text-white',
    accent: 'bg-green-500',
    mutedBg: 'bg-slate-900/50',
    mainBg: 'bg-slate-950/40',
    buttonSecondary: 'bg-slate-800/50 text-slate-200 hover:bg-slate-700/50',
  },
  birthday: {
    name: 'Birthday',
    bg: 'bg-pink-50',
    sidebar: 'bg-white/95 border-r border-pink-100/50',
    header: 'bg-white/95 border-b border-pink-100/50',
    card: 'bg-white/70 border-pink-100/50 hover:border-pink-400/30',
    text: 'text-slate-900',
    subText: 'text-pink-600/60',
    navIcon: 'text-pink-300',
    border: 'border-pink-50',
    input: 'bg-pink-50/50 border-pink-100 text-slate-900 focus:border-pink-400',
    primary: 'bg-pink-500 hover:bg-pink-600 text-white',
    accent: 'bg-pink-500',
    mutedBg: 'bg-pink-50/50',
    mainBg: 'bg-white/40',
    buttonSecondary: 'bg-pink-100/50 text-pink-600 hover:bg-pink-200/50',
  },
  qidan: {
    name: 'Qidan',
    bg: 'bg-purple-50',
    sidebar: 'bg-white/95 border-r border-purple-100/50',
    header: 'bg-white/95 border-b border-purple-100/50',
    card: 'bg-white/70 border-purple-100/50 hover:border-purple-400/30',
    text: 'text-slate-900',
    subText: 'text-purple-600/60',
    navIcon: 'text-purple-300',
    border: 'border-purple-50',
    input: 'bg-purple-50/50 border-purple-100 text-slate-900 focus:border-purple-400',
    primary: 'bg-purple-500 hover:bg-purple-600 text-white',
    accent: 'bg-purple-500',
    mutedBg: 'bg-purple-50/50',
    mainBg: 'bg-white/40',
    buttonSecondary: 'bg-purple-100/50 text-purple-600 hover:bg-purple-200/50',
  },
};

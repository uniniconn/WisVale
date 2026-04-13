import { useState, useEffect } from 'react';
import { useTimePeriod } from './useTimePeriod';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { BirthdaySettings } from '../types';

export function useTheme() {
  const timePeriod = useTimePeriod();
  const isNight = timePeriod === 'night';
  const [isBirthday, setIsBirthday] = useState(false);
  const [birthdaySlogan, setBirthdaySlogan] = useState('生日快乐！');
  const [isQidan, setIsQidan] = useState(false);
  const [qidanSlogan, setQidanSlogan] = useState('紫海猖狂，七单为王');

  useEffect(() => {
    const unsubscribeBirthday = onSnapshot(doc(db, 'settings', 'birthday'), (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data() as BirthdaySettings;
        setIsBirthday(settings.isEnabled);
        setBirthdaySlogan(settings.slogan || '生日快乐！');
      } else {
        setIsBirthday(false);
        setBirthdaySlogan('生日快乐！');
      }
    });

    const unsubscribeQidan = onSnapshot(doc(db, 'settings', 'qidan'), (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data() as BirthdaySettings; // Reusing type for simplicity
        setIsQidan(settings.isEnabled);
        setQidanSlogan(settings.slogan || '紫海猖狂，七单为王');
      } else {
        setIsQidan(false);
        setQidanSlogan('紫海猖狂，七单为王');
      }
    });

    return () => {
      unsubscribeBirthday();
      unsubscribeQidan();
    };
  }, []);

  const getBgGradient = () => {
    if (isQidan) return 'from-purple-300 via-fuchsia-100 to-violet-200';
    if (isBirthday) return 'from-pink-300 via-rose-100 to-purple-200';
    switch (timePeriod) {
      case 'morning': return 'from-orange-200 via-rose-100 to-amber-200';
      case 'day': return 'from-sky-300 via-white to-blue-200';
      case 'dusk': return 'from-orange-300 via-purple-200 to-indigo-300';
      case 'night': return 'from-slate-950 via-indigo-950 to-slate-900';
      default: return 'from-slate-50 via-white to-slate-100';
    }
  };

  const theme = {
    text: isNight ? 'text-slate-100' : 'text-slate-900',
    subText: isNight ? 'text-slate-400' : 'text-slate-500',
    border: isNight ? 'border-slate-800/50' : 'border-slate-200/50',
    card: isNight ? 'bg-slate-900/40 border-slate-800/50 text-slate-100' : 'bg-white/40 border-slate-200/50 text-slate-900',
    innerCard: isNight ? 'bg-slate-900/30 border-slate-800/50' : 'bg-white/30 border-slate-100',
    mutedBg: isNight ? 'bg-slate-900/30' : 'bg-slate-50/30',
    input: isNight ? 'bg-slate-800/30 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white/30 border-slate-200 text-slate-900 placeholder-slate-400',
    buttonSecondary: isNight ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50' : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200/50',
    sidebar: isNight ? 'bg-slate-950/60 border-slate-800/50' : 'bg-white/60 border-slate-200/50',
    navItem: isNight ? 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-100' : 'text-slate-500 hover:bg-slate-50/40 hover:text-slate-900',
    navIcon: isNight ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600',
    header: isNight ? 'bg-slate-950/50 border-slate-800/50' : 'bg-white/50 border-slate-200/50',
    mainBg: isNight ? 'bg-slate-950/30' : 'bg-white/30',
  };

  const getBirthdayTheme = () => {
    return {
      ...theme,
      text: 'text-rose-900',
      subText: 'text-rose-600',
      border: 'border-rose-200/50',
      card: 'bg-white/60 border-rose-200/50 text-rose-900',
      innerCard: 'bg-rose-50/50 border-rose-100',
      mutedBg: 'bg-rose-50/30',
      input: 'bg-white/50 border-rose-200 text-rose-900 placeholder-rose-300',
      buttonSecondary: 'bg-rose-100/50 text-rose-600 hover:bg-rose-200/50',
      sidebar: 'bg-white/80 border-rose-200/50',
      navItem: 'text-rose-600 hover:bg-rose-50 hover:text-rose-900',
      navIcon: 'text-rose-400 group-hover:text-rose-600',
      header: 'bg-white/70 border-rose-200/50',
      mainBg: 'bg-white/40',
    };
  };

  const getQidanTheme = () => {
    return {
      ...theme,
      text: 'text-purple-900',
      subText: 'text-purple-600',
      border: 'border-purple-200/50',
      card: 'bg-white/60 border-purple-200/50 text-purple-900',
      innerCard: 'bg-purple-50/50 border-purple-100',
      mutedBg: 'bg-purple-50/30',
      input: 'bg-white/50 border-purple-200 text-purple-900 placeholder-purple-300',
      buttonSecondary: 'bg-purple-100/50 text-purple-600 hover:bg-purple-200/50',
      sidebar: 'bg-white/80 border-purple-200/50',
      navItem: 'text-purple-600 hover:bg-purple-50 hover:text-purple-900',
      navIcon: 'text-purple-400 group-hover:text-purple-600',
      header: 'bg-white/70 border-purple-200/50',
      mainBg: 'bg-white/40',
    };
  };

  const activeTheme = isQidan ? getQidanTheme() : (isBirthday ? getBirthdayTheme() : theme);

  return {
    timePeriod,
    isNight,
    isBirthday,
    birthdaySlogan,
    isQidan,
    qidanSlogan,
    getBgGradient,
    theme: activeTheme
  };
}

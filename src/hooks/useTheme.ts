import { useState, useEffect } from 'react';
import { useTimePeriod } from './useTimePeriod';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { BirthdaySettings } from '../types';
import { THEMES, Theme } from '../constants/themes';

export function useTheme() {
  const timePeriod = useTimePeriod();
  const isNight = timePeriod === 'night';
  const { user } = useAuth();
  const [isBirthday, setIsBirthday] = useState(false);
  const [birthdaySlogan, setBirthdaySlogan] = useState('生日快乐！');
  const [isQidan, setIsQidan] = useState(false);
  const [qidanSlogan, setQidanSlogan] = useState('紫海猖狂，七单为王');
  const [isArtMode, setIsArtMode] = useState(false);
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [bgBlur, setBgBlur] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Birthday Settings
        const birthday = await api.get('settings', 'birthday');
        if (birthday) {
          setIsBirthday(birthday.isEnabled);
          setBirthdaySlogan(birthday.slogan || '生日快乐！');
        }

        // Qidan Settings
        const qidan = await api.get('settings', 'qidan');
        if (qidan) {
          setIsQidan(qidan.isEnabled);
          setQidanSlogan(qidan.slogan || '紫海猖狂，七单为王');
        }

        // Art Settings
        const art = await api.get('settings', 'art');
        if (art) {
          setIsArtMode(art.isEnabled);
        }

        // User Custom Background
        if (user?.uid) {
          const userData = await api.get('users', user.uid);
          setCustomBgUrl(userData.customBgUrl || null);
          setBgBlur(userData.bgBlur || 0);
        } else {
          setCustomBgUrl(null);
          setBgBlur(0);
        }
      } catch (err) {
        console.error("Error fetching theme data:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000); // Poll every 120s
    return () => clearInterval(interval);
  }, [user?.uid]);

  const themeKey = isQidan ? 'qidan' : (isBirthday ? 'birthday' : (isNight ? 'night' : 'day'));
  const activeTheme: Theme = THEMES[themeKey];

  const getBgGradient = () => {
    if (isQidan) return 'from-purple-300 via-fuchsia-100 to-violet-200';
    if (isBirthday) return 'from-pink-300 via-rose-100 to-purple-200';
    if (customBgUrl) return 'bg-transparent';
    switch (timePeriod) {
      case 'morning': return 'from-orange-200 via-rose-100 to-amber-200';
      case 'day': return 'from-sky-300 via-white to-blue-200';
      case 'dusk': return 'from-orange-300 via-purple-200 to-indigo-300';
      case 'night': return 'from-slate-950 via-indigo-950 to-slate-900';
      default: return 'from-slate-50 via-white to-slate-100';
    }
  };

  const getBgImage = () => customBgUrl;

  return {
    timePeriod,
    isNight,
    isBirthday,
    birthdaySlogan,
    isQidan,
    qidanSlogan,
    isArtMode,
    customBgUrl,
    bgBlur,
    getBgGradient,
    getBgImage,
    theme: activeTheme
  };
}

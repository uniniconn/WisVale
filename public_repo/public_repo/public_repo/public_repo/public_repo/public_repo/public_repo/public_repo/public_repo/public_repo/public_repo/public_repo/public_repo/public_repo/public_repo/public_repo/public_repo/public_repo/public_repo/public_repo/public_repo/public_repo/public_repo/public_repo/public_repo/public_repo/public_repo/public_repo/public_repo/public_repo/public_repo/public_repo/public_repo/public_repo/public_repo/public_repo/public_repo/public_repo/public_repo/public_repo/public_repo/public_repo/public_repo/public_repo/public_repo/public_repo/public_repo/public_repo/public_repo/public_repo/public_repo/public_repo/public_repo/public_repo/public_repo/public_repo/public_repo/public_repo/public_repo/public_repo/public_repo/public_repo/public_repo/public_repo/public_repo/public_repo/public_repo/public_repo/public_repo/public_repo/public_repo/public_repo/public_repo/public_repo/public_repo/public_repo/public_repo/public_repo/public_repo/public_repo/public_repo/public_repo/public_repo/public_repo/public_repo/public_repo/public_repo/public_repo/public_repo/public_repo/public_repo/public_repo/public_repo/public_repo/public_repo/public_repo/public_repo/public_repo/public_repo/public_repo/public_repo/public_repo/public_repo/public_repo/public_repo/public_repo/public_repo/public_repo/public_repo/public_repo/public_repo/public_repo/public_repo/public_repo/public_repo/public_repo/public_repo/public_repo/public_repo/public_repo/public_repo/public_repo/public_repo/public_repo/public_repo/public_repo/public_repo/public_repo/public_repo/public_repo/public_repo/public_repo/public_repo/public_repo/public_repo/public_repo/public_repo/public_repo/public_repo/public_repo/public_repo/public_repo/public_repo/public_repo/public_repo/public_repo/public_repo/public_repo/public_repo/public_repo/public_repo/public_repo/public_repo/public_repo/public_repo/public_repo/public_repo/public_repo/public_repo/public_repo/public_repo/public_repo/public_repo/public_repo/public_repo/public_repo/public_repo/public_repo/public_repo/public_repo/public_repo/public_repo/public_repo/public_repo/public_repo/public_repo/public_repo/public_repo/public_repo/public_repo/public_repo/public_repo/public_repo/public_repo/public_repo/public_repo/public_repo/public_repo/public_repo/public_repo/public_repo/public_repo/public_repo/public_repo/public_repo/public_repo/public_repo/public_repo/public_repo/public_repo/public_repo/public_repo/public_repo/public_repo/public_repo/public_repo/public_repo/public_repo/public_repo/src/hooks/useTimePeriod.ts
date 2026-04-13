import { useState, useEffect } from 'react';

export type TimePeriod = 'morning' | 'day' | 'dusk' | 'night';

export function useTimePeriod() {
  const [period, setPeriod] = useState<TimePeriod>('day');

  useEffect(() => {
    const updatePeriod = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 9) {
        setPeriod('morning');
      } else if (hour >= 9 && hour < 18) {
        setPeriod('day');
      } else if (hour >= 18 && hour < 19) {
        setPeriod('dusk');
      } else {
        setPeriod('night');
      }
    };

    updatePeriod();
    const interval = setInterval(updatePeriod, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return period;
}

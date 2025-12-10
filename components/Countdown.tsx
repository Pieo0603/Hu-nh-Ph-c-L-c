import React, { useState, useEffect } from 'react';
import { TimeLeft, ThemeConfig } from '../types';

interface CountdownProps {
  targetDate: Date;
  theme: ThemeConfig;
}

const Countdown: React.FC<CountdownProps> = ({ targetDate, theme }) => {
  const calculateTimeLeft = (): TimeLeft => {
    const difference = +targetDate - +new Date();
    let timeLeft: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center w-full group cursor-default z-10">
      {/* Box Container - Viền và Shadow đổi theo Theme */}
      <div className={`
        relative w-full aspect-square max-w-[100px] md:max-w-[140px] 
        bg-[#111111]/80 backdrop-blur-xl rounded-2xl md:rounded-3xl
        flex items-center justify-center 
        border border-white/10 group-hover:${theme.border}
        shadow-lg group-hover:${theme.shadow}
        transition-all duration-300 transform group-hover:-translate-y-1
      `}>
        {/* Glow Effect Inner */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl md:rounded-3xl pointer-events-none"></div>
        
        {/* Number Text - DYNAMIC THEME GRADIENT */}
        <div className={`text-4xl md:text-6xl font-black font-heading bg-clip-text text-transparent bg-gradient-to-br ${theme.gradientTitle} drop-shadow-sm z-10`}>
          {value < 10 ? `0${value}` : value}
        </div>
      </div>
      
      {/* Label */}
      <span className={`mt-3 text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-gray-500 group-hover:${theme.text} transition-colors`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mt-12 w-full max-w-4xl mx-auto justify-items-center px-2 relative z-0">
      <TimeBox value={timeLeft.days} label="Ngày" />
      <TimeBox value={timeLeft.hours} label="Giờ" />
      <TimeBox value={timeLeft.minutes} label="Phút" />
      <TimeBox value={timeLeft.seconds} label="Giây" />
    </div>
  );
};

export default Countdown;
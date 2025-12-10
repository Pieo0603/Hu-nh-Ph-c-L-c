import React, { useEffect, useRef } from 'react';

const StarBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // --- CẤU HÌNH ---
    const STAR_COUNT = 150; // Giữ lại số lượng sao nền vừa phải

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      ctx.scale(dpr, dpr);
    };

    handleResize();

    // 1. Sao nền (Chỉ giữ lại sao lấp lánh)
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random(),
      speed: Math.random() * 0.05 + 0.005
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Gradient nền
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0f0c29');   
      gradient.addColorStop(0.5, '#302b63'); 
      gradient.addColorStop(1, '#24243e');   
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Vẽ sao
      stars.forEach(star => {
        ctx.beginPath();
        // Hiệu ứng nhấp nháy nhẹ
        const alpha = Math.abs(Math.sin(Date.now() * 0.001 * star.speed + star.x));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
    />
  );
};

export default StarBackground;
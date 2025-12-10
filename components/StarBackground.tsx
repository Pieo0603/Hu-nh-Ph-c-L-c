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

    // 1. Khởi tạo sao với vị trí và vận tốc (vx, vy)
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.5,
      twinkleSpeed: Math.random() * 0.05 + 0.005, // Tốc độ nhấp nháy
      // Vận tốc di chuyển ngẫu nhiên (trôi nhẹ)
      vx: (Math.random() - 0.5) * 0.5, 
      vy: (Math.random() - 0.5) * 0.5
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

      // Vẽ sao và cập nhật vị trí
      stars.forEach(star => {
        // Cập nhật vị trí
        star.x += star.vx;
        star.y += star.vy;

        // Nếu sao bay ra khỏi màn hình thì cho nó xuất hiện lại ở phía đối diện (Wrap around)
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        ctx.beginPath();
        // Hiệu ứng nhấp nháy nhẹ dựa trên thời gian
        const alpha = Math.abs(Math.sin(Date.now() * 0.001 * star.twinkleSpeed + star.x));
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
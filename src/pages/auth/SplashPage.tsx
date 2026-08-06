import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo-nannai.png';
import { useAuthStore } from '../../stores/authStore';

export function SplashPage() {
  const navigate = useNavigate();
  const splashDone = useAuthStore((s) => s.splashDone);
  const setSplashDone = useAuthStore((s) => s.setSplashDone);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setSplashDone();
      navigate(isAuthenticated ? '/app' : '/login', { replace: true });
    }, 2400);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(timer);
    };
  }, [navigate, setSplashDone, isAuthenticated]);

  if (splashDone) return null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-cream-100 px-6">
      <div
        className={`flex flex-col items-center transition-all duration-1000 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <img
          src={logo}
          alt="NANNAI Nutrição — Alimentar bem, viver melhor"
          className="h-48 w-auto max-w-[320px] object-contain md:h-56"
        />
        <div className="mt-10 h-1 w-28 overflow-hidden rounded-full bg-cream-300">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-olive-500 via-gold-500 to-wine-700" />
        </div>
      </div>
    </div>
  );
}

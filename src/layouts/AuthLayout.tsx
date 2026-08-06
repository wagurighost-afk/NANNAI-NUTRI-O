import { Outlet } from 'react-router-dom';
import logo from '../assets/logo-nannai.png';

export function AuthLayout() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-olive-200/40 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-72 w-72 rounded-full bg-gold-200/35 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-olive-100/50 blur-3xl" />
      </div>

      <div className="relative z-10 mb-8 flex flex-col items-center text-center">
        <img
          src={logo}
          alt="NANNAI Nutrição — Alimentar bem, viver melhor"
          className="h-36 w-auto max-w-[280px] object-contain drop-shadow-sm md:h-44"
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}

import { Outlet, useLocation } from 'react-router-dom';
import logo from '../assets/logo-nannai.png';
import { BRAND } from '../data/mock';
import { cn } from '../utils';

export function AuthLayout() {
  const { pathname } = useLocation();
  const isLogin = pathname === '/login';

  return (
    <div className="flex min-h-dvh flex-col bg-cream-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-olive-200/30 blur-3xl" />
        <div className="absolute -right-20 bottom-24 h-96 w-96 rounded-full bg-gold-200/25 blur-3xl" />
      </div>

      <div
        className={cn(
          'relative z-10 flex flex-1',
          isLogin ? 'items-stretch' : 'items-center justify-center px-4 py-10',
        )}
      >
        {isLogin ? (
          <Outlet />
        ) : (
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center">
              <img
                src={logo}
                alt={BRAND.name}
                className="h-32 w-auto max-w-[240px] object-contain"
              />
            </div>
            <Outlet />
          </div>
        )}
      </div>

      <footer className="relative z-10 flex flex-col gap-2 bg-olive-700 px-5 py-3 text-cream-50 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt=""
            className="h-9 w-9 rounded-full object-cover object-top brightness-110 contrast-110"
          />
          <p className="text-xs sm:text-sm">
            {BRAND.name} — {BRAND.slogan}
          </p>
        </div>
        <p className="text-xs uppercase tracking-wide text-cream-200 sm:text-sm">
          {BRAND.initialUnit}
        </p>
      </footer>
    </div>
  );
}

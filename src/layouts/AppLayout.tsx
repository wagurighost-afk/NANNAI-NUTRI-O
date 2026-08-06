import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  ClipboardList,
  ListChecks,
  BarChart3,
  LineChart,
  Users,
  Building2,
  FileQuestion,
  Settings,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
  CloudOff,
  Plus,
  Mail,
  Contact,
} from 'lucide-react';
import { useState } from 'react';
import logo from '../assets/logo-nannai.png';
import { BRAND } from '../data/mock';
import { useAuthStore } from '../stores/authStore';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { roleLabels, cn } from '../utils';
import { Button } from '../components/ui/Button';

import type { UserRole } from '../types';

const navItems: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles?: UserRole[];
}[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/auditorias/nova', label: 'Nova auditoria', icon: Plus },
  { to: '/app/auditorias', label: 'Auditorias', icon: ClipboardCheck },
  { to: '/app/planos-de-acao', label: 'Planos de ação', icon: ListChecks },
  { to: '/app/relatorios', label: 'Relatórios', icon: ClipboardList },
  { to: '/app/indicadores', label: 'Indicadores', icon: LineChart },
  {
    to: '/app/destinatarios-relatorios',
    label: 'Destinatários dos relatórios',
    icon: Contact,
    roles: ['admin', 'gestor'],
  },
  {
    to: '/app/historico-emails',
    label: 'Histórico de e-mails',
    icon: Mail,
    roles: ['admin', 'gestor'],
  },
  { to: '/app/usuarios', label: 'Usuários', icon: Users, roles: ['admin', 'gestor'] },
  { to: '/app/unidades', label: 'Unidades e setores', icon: Building2, roles: ['admin', 'gestor'] },
  { to: '/app/questionarios', label: 'Questionários', icon: FileQuestion, roles: ['admin', 'gestor'] },
  { to: '/app/configuracoes', label: 'Configurações', icon: Settings },
];

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { online, syncing, pendingSyncCount, emailFlushMessage } = useOnlineStatus();

  const visible = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <div className="flex min-h-dvh">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-cream-200 bg-white/95 backdrop-blur-md transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 border-b border-cream-200 px-4 py-3">
          <img
            src={logo}
            alt="NANNAI Nutrição"
            className="h-14 w-auto max-w-[200px] object-contain object-left"
          />
          <button
            type="button"
            className="ml-auto shrink-0 rounded-lg p-1.5 text-ink-muted lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-olive-100 text-olive-800'
                    : 'text-ink-muted hover:bg-cream-100 hover:text-ink',
                )
              }
            >
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-cream-200 p-4">
          <div className="mb-3">
            <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
            <p className="text-xs text-ink-muted">
              {user ? roleLabels[user.role] : ''}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-cream-200/80 bg-cream-50/90 px-4 py-3 backdrop-blur-md">
          <button
            type="button"
            className="rounded-xl border border-cream-300 bg-white p-2 text-ink lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {BRAND.initialUnit}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!online ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-wine-100 px-2.5 py-1 text-xs font-medium text-wine-700">
                <WifiOff size={14} /> Offline
              </span>
            ) : pendingSyncCount > 0 || syncing ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gold-100 px-2.5 py-1 text-xs font-medium text-gold-800">
                <CloudOff size={14} />
                {syncing ? 'Sincronizando…' : `${pendingSyncCount} pendente(s)`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-olive-100 px-2.5 py-1 text-xs font-medium text-olive-800">
                <Wifi size={14} /> Online
              </span>
            )}
            <BarChart3 className="hidden text-olive-500 sm:block" size={18} />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {emailFlushMessage && (
              <p className="mb-4 rounded-xl border border-olive-200 bg-olive-50 px-3 py-2 text-sm text-olive-800">
                {emailFlushMessage}
              </p>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

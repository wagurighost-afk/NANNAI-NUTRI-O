import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  UserRound,
} from 'lucide-react';
import logo from '../../assets/logo-nannai.png';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../utils';

/** Senha inicial oficial dos administradores — deve ser alterada no primeiro acesso */
export const INITIAL_ADMIN_PASSWORD = 'Nannai@2026';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(4, 'Mínimo de 4 caracteres'),
  remember: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    const result = await login(data.email, data.password);
    if (result.ok) navigate('/app');
    else setError(result.error ?? 'Falha no login');
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:py-10">
      {/* Coluna esquerda — marca + conta administrativa */}
      <section className="flex flex-col items-center lg:items-start">
        <img
          src={logo}
          alt="NANNAI Nutrição — Alimentar bem, viver melhor"
          className="h-44 w-auto max-w-[300px] object-contain md:h-52 lg:h-56"
        />

        <div className="mt-8 w-full max-w-md rounded-2xl border border-cream-200 bg-white/90 p-5 shadow-card backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="text-olive-600" size={18} />
            <h2 className="font-display text-lg font-semibold text-wine-700">
              Conta administrativa
            </h2>
          </div>

          <div className="space-y-3">
            <AdminPerson
              name="Renata Fernanda"
              title="Nutricionista"
              badge="Administradora"
              email="renata.fernanda@nannai.com.br"
              profile="Administradora e Nutricionista"
            />
          </div>

          <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50/80 p-3">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold-800">
              <KeyRound size={14} />
              Senha inicial
            </div>
            <p className="font-mono text-base font-semibold tracking-wide text-wine-700">
              {INITIAL_ADMIN_PASSWORD}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Esta é uma senha temporária. No primeiro acesso, use{' '}
              <strong className="text-ink">Esqueci minha senha</strong> ou altere
              a senha nas configurações — a troca é obrigatória por segurança.
            </p>
          </div>
        </div>
      </section>

      {/* Coluna direita — formulário */}
      <section className="flex justify-center lg:justify-end">
        <div className="w-full max-w-md rounded-2xl border border-cream-200 bg-white p-6 shadow-soft sm:p-8">
          <h1 className="font-display text-3xl font-semibold text-olive-700">
            Entrar
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Acesse o sistema de auditorias de segurança alimentar
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <label className="flex w-full flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">E-mail</span>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                  size={16}
                />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Digite seu e-mail"
                  className={cn(
                    'h-11 w-full rounded-xl border border-cream-300 bg-cream-50/50 py-2 pl-10 pr-3.5 text-sm text-ink outline-none transition placeholder:text-ink-muted/50 focus:border-olive-400 focus:bg-white focus:ring-2 focus:ring-olive-200',
                    errors.email && 'border-wine-400 focus:ring-wine-100',
                  )}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <span className="text-xs text-wine-600">
                  {errors.email.message}
                </span>
              )}
            </label>

            <label className="flex w-full flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Senha</span>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                  size={16}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  className={cn(
                    'h-11 w-full rounded-xl border border-cream-300 bg-cream-50/50 py-2 pl-10 pr-11 text-sm text-ink outline-none transition placeholder:text-ink-muted/50 focus:border-olive-400 focus:bg-white focus:ring-2 focus:ring-olive-200',
                    errors.password && 'border-wine-400 focus:ring-wine-100',
                  )}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-muted hover:bg-cream-100 hover:text-ink"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <span className="text-xs text-wine-600">
                  {errors.password.message}
                </span>
              )}
            </label>

            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="size-4 rounded border-cream-300 accent-olive-600"
                {...register('remember')}
              />
              Manter-me conectado
            </label>

            {error && (
              <p className="rounded-lg bg-wine-50 px-3 py-2 text-sm text-wine-700">
                {error}
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              variant="secondary"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link
              to="/recuperar-senha"
              className="font-medium text-olive-700 underline underline-offset-2 hover:text-olive-800"
            >
              Esqueci minha senha
            </Link>
          </div>

          <div className="mt-5 flex gap-2 rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 text-xs text-ink-muted">
            <Shield className="mt-0.5 shrink-0 text-olive-600" size={14} />
            Acesso restrito a usuários autorizados do NANNAI Nutrição.
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminPerson({
  name,
  title,
  badge,
  email,
  profile,
}: {
  name: string;
  title: string;
  badge: string;
  email: string;
  profile: string;
}) {
  return (
    <div className="rounded-xl border border-cream-200 bg-cream-50/70 p-3">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-olive-100 text-olive-700">
          <UserRound size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">
              {name}
              <span className="font-normal text-ink-muted"> — {title}</span>
            </p>
            <span className="rounded-md bg-olive-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cream-50">
              {badge}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-ink-muted">{email}</p>
          <p className="text-xs text-ink-muted">Cargo: {title}</p>
          <p className="text-xs text-ink-muted">Perfil: {profile}</p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound, Lock, Mail, Shield } from 'lucide-react';
import logo from '../../assets/logo-nannai.png';
import { Button } from '../../components/ui/Button';
import { BRAND } from '../../data/mock';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../utils';

/** Senha inicial das contas — trocar no primeiro acesso */
const INITIAL_PASSWORD = 'Nannai@2026';

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
    <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 px-4 py-8 sm:px-6 md:py-12 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10 lg:py-16">
      {/* Identidade visual */}
      <section className="flex flex-col items-center justify-center text-center lg:min-h-[28rem] lg:items-center lg:px-4">
        <img
          src={logo}
          alt="NANNAI Nutrição — Alimentar bem, viver melhor"
          className="h-40 w-auto max-w-[280px] object-contain sm:h-48 md:h-56 lg:h-64 lg:max-w-[340px]"
        />
        <p className="mt-6 font-display text-xl font-medium tracking-wide text-olive-700 sm:text-2xl">
          {BRAND.slogan}
        </p>
        <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-wine-700/80 sm:text-base">
          {BRAND.initialUnit}
        </p>

        <div className="mt-8 w-full max-w-xs rounded-xl border border-gold-200 bg-gold-50/80 px-4 py-3 text-left">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold-800">
            <KeyRound size={14} />
            Senha inicial
          </div>
          <p className="font-mono text-base font-semibold tracking-wide text-wine-700">
            {INITIAL_PASSWORD}
          </p>
        </div>
      </section>

      {/* Formulário */}
      <section className="mt-10 flex justify-center lg:mt-0 lg:justify-end">
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

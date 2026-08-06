import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(4, 'Mínimo de 4 caracteres'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'renata.fernanda@nannai.com.br',
      password: '1234',
    },
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    const result = await login(data.email, data.password);
    if (result.ok) navigate('/app');
    else setError(result.error ?? 'Falha no login');
  };

  return (
    <Card className="animate-[fadeIn_0.5s_ease]">
      <h2 className="font-display text-2xl font-semibold text-wine-700">
        Entrar
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Acesse o sistema de auditorias de segurança alimentar
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {error && (
          <p className="rounded-lg bg-wine-50 px-3 py-2 text-sm text-wine-700">
            {error}
          </p>
        )}
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link
          to="/recuperar-senha"
          className="text-olive-700 underline-offset-2 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>
      <p className="mt-4 rounded-xl bg-cream-100 px-3 py-2 text-xs text-ink-muted">
        Admins: <strong>mauro.jose@nannai.com.br</strong> ou{' '}
        <strong>renata.fernanda@nannai.com.br</strong> / 1234 (mock). Com Firebase,
        use as senhas definidas no seed.
      </p>
    </Card>
  );
}

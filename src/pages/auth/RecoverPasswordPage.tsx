import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
});

type FormData = z.infer<typeof schema>;

export function RecoverPasswordPage() {
  const recoverPassword = useAuthStore((s) => s.recoverPassword);
  const [message, setMessage] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const result = await recoverPassword(data.email);
    setMessage(result.message);
  };

  return (
    <Card>
      <h2 className="font-display text-2xl font-semibold text-wine-700">
        Recuperar senha
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Enviaremos um link de redefinição para o e-mail cadastrado.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input
          label="E-mail"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        {message && (
          <p className="rounded-lg bg-olive-50 px-3 py-2 text-sm text-olive-800">
            {message}
          </p>
        )}
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Enviar link'}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="text-olive-700 hover:underline">
          Voltar ao login
        </Link>
      </div>
    </Card>
  );
}

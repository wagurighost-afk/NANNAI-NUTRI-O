import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader, Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { saveAuditOffline } from '../../services/offlineDb';

const schema = z.object({
  unitId: z.string().min(1, 'Selecione a unidade'),
  sectorId: z.string().min(1, 'Selecione o setor'),
});

type FormData = z.infer<typeof schema>;

export function NewAuditPage() {
  const units = useAppStore((s) => s.units);
  const sectors = useAppStore((s) => s.sectors);
  const questionnaire = useAppStore((s) => s.questionnaire);
  const createAudit = useAppStore((s) => s.createAudit);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      unitId: units[0]?.id ?? '',
      sectorId: '',
    },
  });

  const unitId = watch('unitId');
  const sectorOptions = useMemo(
    () =>
      sectors
        .filter((s) => s.unitId === unitId && s.active)
        .map((s) => ({ value: s.id, label: s.name })),
    [sectors, unitId],
  );

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    const audit = createAudit({
      unitId: data.unitId,
      sectorId: data.sectorId,
      auditorId: user.id,
      auditorName: user.name,
    });
    await saveAuditOffline(audit);
    navigate(`/app/auditorias/${audit.id}/executar`);
  };

  return (
    <div>
      <PageHeader
        title="Nova auditoria"
        subtitle="Configure unidade, setor e questionário antes de iniciar"
      />
      <Card className="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Unidade"
            options={units.map((u) => ({ value: u.id, label: u.name }))}
            error={errors.unitId?.message}
            {...register('unitId')}
          />
          <Select
            label="Setor"
            options={[
              { value: '', label: 'Selecione…' },
              ...sectorOptions,
            ]}
            error={errors.sectorId?.message}
            {...register('sectorId')}
          />
          <div className="rounded-xl border border-cream-200 bg-cream-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Questionário
            </p>
            <p className="mt-1 font-medium text-ink">{questionnaire.name}</p>
            <p className="text-sm text-ink-muted">
              Versão {questionnaire.version} · {questionnaire.sections.length} seções ·{' '}
              {questionnaire.sections.reduce((n, s) => n + s.questions.length, 0)} perguntas
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Iniciando…' : 'Iniciar auditoria'}
            </Button>
            <Link to="/app/auditorias">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

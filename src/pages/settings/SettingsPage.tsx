import { PageHeader, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BRAND } from '../../data/mock';
import { useAppStore } from '../../stores/appStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { isFirebaseEnabled } from '../../firebase/config';
import { syncPendingChanges } from '../../services/offlineDb';

export function SettingsPage() {
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);
  const markSynced = useAppStore((s) => s.markSynced);
  const { online, syncing } = useOnlineStatus();

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Identidade, sincronização e preferências do aplicativo"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Identidade
          </h3>
          <Row label="Nome" value={BRAND.name} />
          <Row label="Slogan" value={BRAND.slogan} />
          <Row label="Unidade inicial" value={BRAND.initialUnit} />
          <Row label="Tema" value="Verde-oliva · Dourado · Vinho · Creme" />
        </Card>

        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Sincronização e PWA
          </h3>
          <Row label="Status da rede" value={online ? 'Online' : 'Offline'} />
          <Row
            label="Firebase"
            value={isFirebaseEnabled ? 'Conectado' : 'Modo simulado (stub pronto)'}
          />
          <Row label="Itens pendentes" value={String(pendingSyncCount)} />
          <Row label="Auto-save" value="A cada 10 segundos durante auditoria" />
          <Row label="IndexedDB" value="nannai-nutricao-offline" />
          <Button
            disabled={!online || syncing || pendingSyncCount === 0}
            onClick={async () => {
              await syncPendingChanges();
              markSynced();
            }}
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
          </Button>
        </Card>

        <Card className="space-y-3 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Integração Firebase
          </h3>
          <p className="text-sm text-ink-muted">
            Para ativar Authentication, Firestore, Storage e Hosting, configure o
            arquivo <code className="rounded bg-cream-200 px-1">.env</code> com as
            variáveis <code className="rounded bg-cream-200 px-1">VITE_FIREBASE_*</code>{' '}
            e defina <code className="rounded bg-cream-200 px-1">VITE_FIREBASE_ENABLED=true</code>.
            O stub está em <code className="rounded bg-cream-200 px-1">src/firebase/config.ts</code>.
          </p>
          <ul className="list-inside list-disc text-sm text-ink-muted">
            <li>Firebase Authentication — login e recuperação de senha</li>
            <li>Cloud Firestore — auditorias, planos, usuários, questionários</li>
            <li>Firebase Storage — fotos e evidências</li>
            <li>Firebase Hosting — publicação do PWA</li>
          </ul>
        </Card>

        <Card className="space-y-3 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Envio de relatórios por e-mail
          </h3>
          <p className="text-sm text-ink-muted">
            O envio é feito por Cloud Function segura (Resend / SendGrid / SES /
            SMTP). Credenciais ficam apenas no backend. Configure{' '}
            <code className="rounded bg-cream-200 px-1">VITE_EMAIL_API_URL</code>{' '}
            no frontend e <code className="rounded bg-cream-200 px-1">RESEND_API_KEY</code>{' '}
            em <code className="rounded bg-cream-200 px-1">functions/</code>. Stub:{' '}
            <code className="rounded bg-cream-200 px-1">functions/sendAuditReportEmail.js</code>.
          </p>
          <Row
            label="API de e-mail"
            value={
              import.meta.env.VITE_EMAIL_API_URL
                ? String(import.meta.env.VITE_EMAIL_API_URL)
                : 'Modo simulado (sem URL configurada)'
            }
          />
          <Row label="Quem pode enviar" value="Administrador, Gestor e Nutricionista" />
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-cream-200 pb-2 sm:flex-row sm:justify-between">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

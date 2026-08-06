import { Link } from 'react-router-dom';
import { PageHeader, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BRAND } from '../../data/mock';
import { useAppStore } from '../../stores/appStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { isFirebaseEnabled } from '../../firebase/config';
import { syncPendingChanges } from '../../services/offlineDb';

export function SettingsPage() {
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);
  const markSynced = useAppStore((s) => s.markSynced);
  const units = useAppStore((s) => s.units);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateUnit = useAppStore((s) => s.updateUnit);
  const { online, syncing } = useOnlineStatus();

  const defaultUnit =
    units.find((u) => u.id === settings.defaultUnitId) ?? units[0];

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Unidade, identidade visual, PWA e sincronização"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Unidade
          </h3>
          {defaultUnit ? (
            <>
              <Input
                label="Nome da unidade"
                value={defaultUnit.name}
                onChange={(e) =>
                  updateUnit(defaultUnit.id, { name: e.target.value })
                }
              />
              <Input
                label="Endereço"
                value={defaultUnit.address ?? ''}
                onChange={(e) =>
                  updateUnit(defaultUnit.id, { address: e.target.value })
                }
              />
              <Input
                label="Cidade"
                value={defaultUnit.city ?? ''}
                onChange={(e) =>
                  updateUnit(defaultUnit.id, { city: e.target.value })
                }
              />
              <p className="text-xs text-ink-muted">
                Alterações ficam salvas localmente. Gerencie setores em{' '}
                <Link to="/app/unidades" className="text-olive-700 underline">
                  Unidades e setores
                </Link>
                .
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Nenhuma unidade cadastrada.</p>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Identidade
          </h3>
          <Input
            label="Nome do sistema"
            value={settings.companyName}
            onChange={(e) => updateSettings({ companyName: e.target.value })}
          />
          <Input
            label="Slogan"
            value={settings.slogan}
            onChange={(e) => updateSettings({ slogan: e.target.value })}
          />
          <Row label="Marca padrão" value={BRAND.name} />
          <div>
            <p className="mb-2 text-sm text-ink-muted">Logo (opcional)</p>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-ink-muted"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === 'string') {
                    updateSettings({ logoDataUrl: reader.result });
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            {settings.logoDataUrl && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => updateSettings({ logoDataUrl: undefined })}
              >
                Restaurar logo NANNAI
              </Button>
            )}
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Cores da marca
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['olive', 'Oliva'],
                ['gold', 'Dourado'],
                ['wine', 'Vinho'],
                ['cream', 'Creme'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="color"
                  value={settings.brandColors[key]}
                  onChange={(e) =>
                    updateSettings({
                      brandColors: {
                        ...settings.brandColors,
                        [key]: e.target.value,
                      },
                    })
                  }
                  className="h-9 w-12 cursor-pointer rounded border border-cream-300"
                />
                <span className="text-ink-muted">{label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-ink-muted">
            As cores ficam registradas nas configurações. O tema visual principal
            do sistema permanece o padrão NANNAI.
          </p>
        </Card>

        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Configurações do PWA
          </h3>
          <ToggleRow
            label="Modo offline"
            checked={settings.pwa.offlineEnabled}
            onChange={(v) =>
              updateSettings({ pwa: { ...settings.pwa, offlineEnabled: v } })
            }
          />
          <ToggleRow
            label="Sincronizar ao reconectar"
            checked={settings.pwa.autoSyncOnReconnect}
            onChange={(v) =>
              updateSettings({
                pwa: { ...settings.pwa, autoSyncOnReconnect: v },
              })
            }
          />
          <ToggleRow
            label="Prompt de instalação"
            checked={settings.pwa.installPromptEnabled}
            onChange={(v) =>
              updateSettings({
                pwa: { ...settings.pwa, installPromptEnabled: v },
              })
            }
          />
          <Row label="Status da rede" value={online ? 'Online' : 'Offline'} />
          <Row
            label="Firebase"
            value={isFirebaseEnabled ? 'Conectado' : 'Modo local (PWA)'}
          />
          <Row label="Itens pendentes" value={String(pendingSyncCount)} />
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
            Cadastros do sistema
          </h3>
          <p className="text-sm text-ink-muted">
            A administradora pode gerenciar todos os módulos abaixo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/app/unidades">
              <Button variant="outline" size="sm">
                Unidade e setores
              </Button>
            </Link>
            <Link to="/app/usuarios">
              <Button variant="outline" size="sm">
                Usuários
              </Button>
            </Link>
            <Link to="/app/destinatarios-relatorios">
              <Button variant="outline" size="sm">
                Destinatários
              </Button>
            </Link>
            <Link to="/app/questionarios">
              <Button variant="outline" size="sm">
                Perguntas, pesos e pontuação
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-3 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Envio de relatórios por e-mail
          </h3>
          <p className="text-sm text-ink-muted">
            O envio é feito por Cloud Function segura. Configure{' '}
            <code className="rounded bg-cream-200 px-1">VITE_EMAIL_API_URL</code>{' '}
            no frontend. Sem URL, o envio é simulado para testes locais.
          </p>
          <Row
            label="API de e-mail"
            value={
              import.meta.env.VITE_EMAIL_API_URL
                ? String(import.meta.env.VITE_EMAIL_API_URL)
                : 'Modo simulado (sem URL configurada)'
            }
          />
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

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 border-b border-cream-200 pb-2 text-sm">
      <span className="text-ink-muted">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-olive-600,#6b7f3a)]"
      />
    </label>
  );
}

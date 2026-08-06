import { useState } from 'react';
import { PageHeader, Card, Badge, Modal } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAppStore } from '../../stores/appStore';

export function UnitsPage() {
  const units = useAppStore((s) => s.units);
  const sectors = useAppStore((s) => s.sectors);
  const users = useAppStore((s) => s.users);
  const addUnit = useAppStore((s) => s.addUnit);
  const addSector = useAppStore((s) => s.addSector);
  const [unitModal, setUnitModal] = useState(false);
  const [sectorModal, setSectorModal] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: '', address: '', city: '' });
  const [sectorForm, setSectorForm] = useState({
    name: '',
    unitId: units[0]?.id ?? '',
    responsibleId: '',
  });

  return (
    <div>
      <PageHeader
        title="Unidades e setores"
        subtitle="Estrutura operacional — unidade inicial NANNAI Muro Alto"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUnitModal(true)}>
              Nova unidade
            </Button>
            <Button onClick={() => setSectorModal(true)}>Novo setor</Button>
          </div>
        }
      />

      <div className="space-y-4">
        {units.map((unit) => (
          <Card key={unit.id}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-xl font-semibold text-wine-700">
                  {unit.name}
                </h3>
                <p className="text-sm text-ink-muted">
                  {[unit.address, unit.city].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Badge
                className={
                  unit.active
                    ? 'border-olive-200 bg-olive-50 text-olive-800'
                    : 'border-stone-200 bg-stone-100'
                }
              >
                {unit.active ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
            <ul className="divide-y divide-cream-200">
              {sectors
                .filter((s) => s.unitId === unit.id)
                .map((s) => {
                  const resp = users.find((u) => u.id === s.responsibleId);
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="font-medium text-ink">{s.name}</span>
                      <span className="text-ink-muted">
                        {resp?.name ?? 'Sem responsável'}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </Card>
        ))}
      </div>

      <Modal open={unitModal} onClose={() => setUnitModal(false)} title="Nova unidade">
        <div className="space-y-3">
          <Input
            label="Nome"
            value={unitForm.name}
            onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Endereço"
            value={unitForm.address}
            onChange={(e) => setUnitForm((f) => ({ ...f, address: e.target.value }))}
          />
          <Input
            label="Cidade"
            value={unitForm.city}
            onChange={(e) => setUnitForm((f) => ({ ...f, city: e.target.value }))}
          />
          <Button
            fullWidth
            onClick={() => {
              if (!unitForm.name) return;
              addUnit({ ...unitForm, active: true });
              setUnitModal(false);
              setUnitForm({ name: '', address: '', city: '' });
            }}
          >
            Salvar
          </Button>
        </div>
      </Modal>

      <Modal open={sectorModal} onClose={() => setSectorModal(false)} title="Novo setor">
        <div className="space-y-3">
          <Input
            label="Nome do setor"
            value={sectorForm.name}
            onChange={(e) => setSectorForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Select
            label="Unidade"
            options={units.map((u) => ({ value: u.id, label: u.name }))}
            value={sectorForm.unitId}
            onChange={(e) =>
              setSectorForm((f) => ({ ...f, unitId: e.target.value }))
            }
          />
          <Select
            label="Responsável"
            options={[
              { value: '', label: 'Não definido' },
              ...users
                .filter((u) => u.role === 'responsavel')
                .map((u) => ({ value: u.id, label: u.name })),
            ]}
            value={sectorForm.responsibleId}
            onChange={(e) =>
              setSectorForm((f) => ({ ...f, responsibleId: e.target.value }))
            }
          />
          <Button
            fullWidth
            onClick={() => {
              if (!sectorForm.name) return;
              addSector({
                name: sectorForm.name,
                unitId: sectorForm.unitId,
                responsibleId: sectorForm.responsibleId || undefined,
                active: true,
              });
              setSectorModal(false);
              setSectorForm({
                name: '',
                unitId: units[0]?.id ?? '',
                responsibleId: '',
              });
            }}
          >
            Salvar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

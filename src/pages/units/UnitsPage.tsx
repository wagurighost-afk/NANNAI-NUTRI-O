import { useState } from 'react';
import { Pencil, Power, Trash2 } from 'lucide-react';
import { PageHeader, Card, Badge, Modal } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAppStore } from '../../stores/appStore';
import type { Sector } from '../../types';

export function UnitsPage() {
  const units = useAppStore((s) => s.units);
  const sectors = useAppStore((s) => s.sectors);
  const users = useAppStore((s) => s.users);
  const addUnit = useAppStore((s) => s.addUnit);
  const updateUnit = useAppStore((s) => s.updateUnit);
  const addSector = useAppStore((s) => s.addSector);
  const updateSector = useAppStore((s) => s.updateSector);
  const deleteSector = useAppStore((s) => s.deleteSector);

  const [unitModal, setUnitModal] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [sectorModal, setSectorModal] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [unitForm, setUnitForm] = useState({ name: '', address: '', city: '' });
  const [sectorForm, setSectorForm] = useState({
    name: '',
    unitId: units[0]?.id ?? '',
    responsibleId: '',
  });

  const openCreateSector = () => {
    setEditingSector(null);
    setSectorForm({
      name: '',
      unitId: units[0]?.id ?? '',
      responsibleId: '',
    });
    setSectorModal(true);
  };

  const openEditSector = (sector: Sector) => {
    setEditingSector(sector);
    setSectorForm({
      name: sector.name,
      unitId: sector.unitId,
      responsibleId: sector.responsibleId ?? '',
    });
    setSectorModal(true);
  };

  const saveSector = () => {
    if (!sectorForm.name.trim()) return;
    if (editingSector) {
      updateSector(editingSector.id, {
        name: sectorForm.name.trim(),
        unitId: sectorForm.unitId,
        responsibleId: sectorForm.responsibleId || undefined,
      });
    } else {
      addSector({
        name: sectorForm.name.trim(),
        unitId: sectorForm.unitId,
        responsibleId: sectorForm.responsibleId || undefined,
        active: true,
      });
    }
    setSectorModal(false);
    setEditingSector(null);
  };

  const confirmDeleteSector = (sector: Sector) => {
    if (
      !window.confirm(
        `Excluir o setor "${sector.name}"? Esta ação não remove auditorias já registradas.`,
      )
    ) {
      return;
    }
    deleteSector(sector.id);
  };

  return (
    <div>
      <PageHeader
        title="Unidades e setores"
        subtitle="NANNAI Muro Alto e setores oficiais — edite, ative, desative ou exclua conforme necessário"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUnitModal(true)}>
              Nova unidade
            </Button>
            <Button onClick={openCreateSector} disabled={units.length === 0}>
              Novo setor
            </Button>
          </div>
        }
      />

      {units.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            Nenhuma unidade cadastrada. Comece criando a unidade do hotel (ex.: NANNAI
            Muro Alto) e, em seguida, os setores.
          </p>
        </Card>
      ) : (
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    unit.active
                      ? 'border-olive-200 bg-olive-50 text-olive-800'
                      : 'border-stone-200 bg-stone-100'
                  }
                >
                  {unit.active ? 'Ativa' : 'Inativa'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingUnitId(unit.id);
                    setUnitForm({
                      name: unit.name,
                      address: unit.address ?? '',
                      city: unit.city ?? '',
                    });
                    setUnitModal(true);
                  }}
                >
                  <Pencil size={14} />
                  Editar unidade
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateUnit(unit.id, { active: !unit.active })}
                >
                  <Power size={14} />
                  {unit.active ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </div>
            <ul className="divide-y divide-cream-200">
              {sectors
                .filter((s) => s.unitId === unit.id)
                .map((s) => {
                  const resp = users.find((u) => u.id === s.responsibleId);
                  return (
                    <li
                      key={s.id}
                      className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-ink">{s.name}</span>
                          <Badge
                            className={
                              s.active
                                ? 'border-olive-200 bg-olive-50 text-olive-800'
                                : 'border-stone-200 bg-stone-100 text-ink-muted'
                            }
                          >
                            {s.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-ink-muted">
                          {resp?.name ?? 'Sem responsável'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditSector(s)}
                        >
                          <Pencil size={14} />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateSector(s.id, { active: !s.active })
                          }
                        >
                          <Power size={14} />
                          {s.active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmDeleteSector(s)}
                        >
                          <Trash2 size={14} />
                          Excluir
                        </Button>
                      </div>
                    </li>
                  );
                })}
              {sectors.filter((s) => s.unitId === unit.id).length === 0 && (
                <li className="py-3 text-sm text-ink-muted">
                  Nenhum setor cadastrado nesta unidade.
                </li>
              )}
            </ul>
          </Card>
        ))}
      </div>
      )}

      <Modal
        open={unitModal}
        onClose={() => {
          setUnitModal(false);
          setEditingUnitId(null);
        }}
        title={editingUnitId ? 'Editar unidade' : 'Nova unidade'}
      >
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
              if (editingUnitId) {
                updateUnit(editingUnitId, { ...unitForm });
              } else {
                addUnit({ ...unitForm, active: true });
              }
              setUnitModal(false);
              setEditingUnitId(null);
              setUnitForm({ name: '', address: '', city: '' });
            }}
          >
            Salvar
          </Button>
        </div>
      </Modal>

      <Modal
        open={sectorModal}
        onClose={() => {
          setSectorModal(false);
          setEditingSector(null);
        }}
        title={editingSector ? 'Editar setor' : 'Novo setor'}
      >
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
            label="Responsável (usuário do sistema)"
            options={[
              { value: '', label: 'Não definido' },
              ...users
                .filter((u) => u.active !== false && u.isActive !== false)
                .map((u) => ({ value: u.id, label: u.name })),
            ]}
            value={sectorForm.responsibleId}
            onChange={(e) =>
              setSectorForm((f) => ({ ...f, responsibleId: e.target.value }))
            }
          />
          <Button fullWidth onClick={saveSector}>
            {editingSector ? 'Salvar alterações' : 'Salvar'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

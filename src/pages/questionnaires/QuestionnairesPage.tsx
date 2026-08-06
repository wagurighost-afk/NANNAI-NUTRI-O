import { useState } from 'react';
import { PageHeader, Card, Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAppStore } from '../../stores/appStore';
import { NUTRISANO_MAX_SCORE } from '../../data/nutrisanoQuestionnaire';

export function QuestionnairesPage() {
  const questionnaire = useAppStore((s) => s.questionnaire);
  const updateQuestionnaire = useAppStore((s) => s.updateQuestionnaire);
  const [selectedSection, setSelectedSection] = useState(questionnaire.sections[0]?.id);

  const section =
    questionnaire.sections.find((s) => s.id === selectedSection) ??
    questionnaire.sections[0];

  const totalQuestions = questionnaire.sections.reduce(
    (n, s) => n + s.questions.length,
    0,
  );
  const totalMax = questionnaire.sections.reduce(
    (n, s) => n + s.questions.reduce((qSum, q) => qSum + (q.active ? q.maxScore : 0), 0),
    0,
  );

  const updateQuestion = (
    questionId: string,
    patch: { maxScore?: number; partialScore?: number; weight?: number },
  ) => {
    updateQuestionnaire({
      ...questionnaire,
      sections: questionnaire.sections.map((sec) => ({
        ...sec,
        questions: sec.questions.map((q) => {
          if (q.id !== questionId) return q;
          const maxScore = patch.maxScore ?? q.maxScore;
          const partialScore =
            patch.partialScore !== undefined ? patch.partialScore : q.partialScore;
          return {
            ...q,
            ...patch,
            maxScore,
            partialScore,
            allowsPartial: partialScore != null && partialScore > 0,
          };
        }),
      })),
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleActive = (questionId: string) => {
    updateQuestionnaire({
      ...questionnaire,
      sections: questionnaire.sections.map((sec) => ({
        ...sec,
        questions: sec.questions.map((q) =>
          q.id === questionId ? { ...q, active: !q.active } : q,
        ),
      })),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div>
      <PageHeader
        title="Gerenciamento dos questionários"
        subtitle={`${questionnaire.name} · v${questionnaire.version}`}
      />

      <Card className="mb-4">
        <p className="font-medium text-ink">{questionnaire.name}</p>
        <p className="text-sm text-ink-muted">{questionnaire.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className="border-olive-200 bg-olive-50 text-olive-800">
            {questionnaire.sections.length} seções
          </Badge>
          <Badge className="border-gold-200 bg-gold-50 text-gold-900">
            {totalQuestions} perguntas
          </Badge>
          <Badge className="border-wine-200 bg-wine-50 text-wine-700">
            Nota máxima {totalMax || NUTRISANO_MAX_SCORE}
          </Badge>
          <Badge className="border-olive-200 bg-olive-50 text-olive-800">
            {questionnaire.active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        {questionnaire.sections.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={s.id === section?.id ? 'secondary' : 'outline'}
            onClick={() => setSelectedSection(s.id)}
          >
            {s.order}. {s.name.replace(/^\d+\.\s*/, '').slice(0, 28)}
            {s.name.replace(/^\d+\.\s*/, '').length > 28 ? '…' : ''}
          </Button>
        ))}
      </div>

      {section && (
        <Card>
          <h3 className="mb-1 font-display text-lg font-semibold text-wine-700">
            {section.name}
          </h3>
          <p className="mb-4 text-sm text-ink-muted">{section.description}</p>
          <ul className="space-y-4">
            {section.questions.map((q) => (
              <li
                key={q.id}
                className="rounded-xl border border-cream-200 bg-cream-50/60 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-ink">
                    {section.order}.{q.order}. {q.text}
                  </p>
                  {q.critical && (
                    <Badge className="border-wine-200 bg-wine-50 text-wine-700">
                      Crítica
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="w-28">
                    <Input
                      label="Conforme (pts)"
                      type="number"
                      min={0}
                      value={q.maxScore}
                      onChange={(e) =>
                        updateQuestion(q.id, {
                          maxScore: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      label="Parcial (pts)"
                      type="number"
                      min={0}
                      value={q.partialScore ?? ''}
                      placeholder="—"
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateQuestion(q.id, {
                          partialScore: raw === '' ? undefined : Number(raw) || 0,
                        });
                      }}
                    />
                  </div>
                  <p className="pb-2 text-sm text-ink-muted">
                    NC = 0 · N/A = 0
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(q.id)}
                  >
                    {q.active ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

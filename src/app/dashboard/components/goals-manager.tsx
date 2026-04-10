"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GoalItem = {
  id: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
  status: "not_started" | "in_progress" | "completed";
};

type Dict = {
  createTitle: string;
  listTitle: string;
  name: string;
  target: string;
  saved: string;
  deadline: string;
  add: string;
  saving: string;
  noItems: string;
  progress: string;
  status: string;
  action: string;
  updateSaved: string;
  remove: string;
  saveOk: string;
  saveFail: string;
  updateOk: string;
  updateFail: string;
  removeFail: string;
  confirmRemove: string;
  notStarted: string;
  inProgress: string;
  completed: string;
};

const textByLang: Record<string, Dict> = {
  "pt-PT": {
    createTitle: "Criar objetivo",
    listTitle: "Metas de poupança",
    name: "Nome",
    target: "Objetivo",
    saved: "Poupado",
    deadline: "Prazo",
    add: "Guardar objetivo",
    saving: "A guardar...",
    noItems: "Sem objetivos registados.",
    progress: "Progresso",
    status: "Estado",
    action: "Ação",
    updateSaved: "Atualizar poupado",
    remove: "Anular",
    saveOk: "Objetivo criado.",
    saveFail: "Falha ao criar objetivo.",
    updateOk: "Progresso atualizado.",
    updateFail: "Falha ao atualizar objetivo.",
    removeFail: "Falha ao anular objetivo.",
    confirmRemove: "Queres anular este objetivo?",
    notStarted: "Não iniciado",
    inProgress: "Em progresso",
    completed: "Concluído"
  },
  "en-US": {
    createTitle: "Create goal",
    listTitle: "Savings goals",
    name: "Name",
    target: "Target",
    saved: "Saved",
    deadline: "Deadline",
    add: "Save goal",
    saving: "Saving...",
    noItems: "No goals registered.",
    progress: "Progress",
    status: "Status",
    action: "Action",
    updateSaved: "Update saved amount",
    remove: "Cancel",
    saveOk: "Goal created.",
    saveFail: "Failed to create goal.",
    updateOk: "Progress updated.",
    updateFail: "Failed to update goal.",
    removeFail: "Failed to remove goal.",
    confirmRemove: "Do you want to remove this goal?",
    notStarted: "Not started",
    inProgress: "In progress",
    completed: "Completed"
  }
};

function formatMoney(value: number, lang: string, currency: string) {
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function statusText(status: GoalItem["status"], t: Dict) {
  if (status === "completed") return t.completed;
  if (status === "in_progress") return t.inProgress;
  return t.notStarted;
}

export function GoalsManager({
  lang,
  currency,
  initialGoals
}: {
  lang: string;
  currency: string;
  initialGoals: GoalItem[];
}) {
  const router = useRouter();
  const t = textByLang[lang] || textByLang["en-US"];

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createGoal(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          targetAmount: Number(targetAmount),
          savedAmount: Number(savedAmount || 0),
          deadline: deadline || undefined,
          status: "in_progress"
        })
      });

      if (!response.ok) {
        setMessage(t.saveFail);
        return;
      }

      setName("");
      setTargetAmount("");
      setSavedAmount("");
      setDeadline("");
      setMessage(t.saveOk);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function updateSaved(goalId: number, value: string) {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) return;

    setSavingId(goalId);
    setMessage(null);
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedAmount: next })
      });
      if (!response.ok) {
        setMessage(t.updateFail);
        return;
      }
      setMessage(t.updateOk);
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  async function removeGoal(goalId: number) {
    const ok = window.confirm(t.confirmRemove);
    if (!ok) return;

    const response = await fetch(`/api/goals/${goalId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setMessage(t.removeFail);
      return;
    }

    router.refresh();
  }

  return (
    <div className="goals-grid">
      <article className="panel">
        <div className="panel-head">
          <h3>{t.createTitle}</h3>
        </div>
        <form className="recurring-form" onSubmit={createGoal}>
          <label className="q-field">
            <span>{t.name}</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <div className="q-grid">
            <label className="q-field">
              <span>{t.target}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </label>
            <label className="q-field">
              <span>{t.saved}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={savedAmount}
                onChange={(e) => setSavedAmount(e.target.value)}
              />
            </label>
          </div>

          <label className="q-field">
            <span>{t.deadline}</span>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>

          <div className="recurring-actions">
            <button type="submit" disabled={loading}>
              {loading ? t.saving : t.add}
            </button>
          </div>

          {message ? <p className="q-msg">{message}</p> : null}
        </form>
      </article>

      <article className="panel goals-list-panel">
        <div className="panel-head">
          <h3>{t.listTitle}</h3>
        </div>
        {initialGoals.length ? (
          <ul className="goals-list">
            {initialGoals.map((goal) => {
              const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100)) : 0;
              const st = goal.status === "completed" ? "in" : goal.status === "in_progress" ? "warn" : "out";

              return (
                <li key={goal.id}>
                  <div className="goals-top-row">
                    <div>
                      <b>{goal.name}</b>
                      <p>
                        {t.target}: {formatMoney(goal.targetAmount, lang, currency)} · {t.deadline}:{" "}
                        {goal.deadline ? new Date(goal.deadline).toLocaleDateString(lang) : "—"}
                      </p>
                    </div>
                    <span className={`activity-kind ${st}`}>{statusText(goal.status, t)}</span>
                  </div>

                  <div className="budget-usage-cell">
                    <div className="budget-mini-track">
                      <div className={st} style={{ width: `${pct}%` }} />
                    </div>
                    <small>
                      {t.progress}: {pct}%
                    </small>
                  </div>

                  <div className="goals-actions-row">
                    <label className="q-field">
                      <span>{t.saved}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={goal.savedAmount.toString()}
                        onBlur={(e) => updateSaved(goal.id, e.target.value)}
                      />
                    </label>
                    <button type="button" className="activity-delete-btn" onClick={() => removeGoal(goal.id)}>
                      {savingId === goal.id ? t.saving : t.remove}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="activity-empty">{t.noItems}</p>
        )}
      </article>
    </div>
  );
}

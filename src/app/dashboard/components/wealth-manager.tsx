"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoneyConverted } from "@/lib/currency-conversion";

type AssetItem = {
  id: number;
  name: string;
  assetType: string;
  value: number;
};

type DebtItem = {
  id: number;
  name: string;
  totalOwed: number;
  amountPaid: number;
  interestRate: number;
};

function formatMoney(value: number, lang: string, currency: string) {
  return formatMoneyConverted(value, lang, currency, 2);
}

export function WealthManager({
  lang,
  currency,
  assets,
  debts,
  periodLabel
}: {
  lang: string;
  currency: string;
  assets: AssetItem[];
  debts: DebtItem[];
  periodLabel?: string;
}) {
  const router = useRouter();
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("Savings");
  const [assetValue, setAssetValue] = useState("");

  const [debtName, setDebtName] = useState("");
  const [debtTotal, setDebtTotal] = useState("");
  const [debtPaid, setDebtPaid] = useState("");
  const [debtRate, setDebtRate] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createAsset(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg(null);
    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: assetName,
          assetType,
          value: Number(assetValue)
        })
      });
      if (!response.ok) {
        setMsg("Falha ao criar ativo.");
        return;
      }
      setAssetName("");
      setAssetType("Savings");
      setAssetValue("");
      setMsg("Ativo adicionado.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function createDebt(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg(null);
    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: debtName,
          totalOwed: Number(debtTotal),
          amountPaid: Number(debtPaid || 0),
          interestRate: Number(debtRate || 0)
        })
      });
      if (!response.ok) {
        setMsg("Falha ao criar dívida.");
        return;
      }
      setDebtName("");
      setDebtTotal("");
      setDebtPaid("");
      setDebtRate("");
      setMsg("Dívida adicionada.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function updateAssetValue(id: number, value: string) {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) return;
    const response = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: next })
    });
    if (!response.ok) {
      setMsg("Falha ao atualizar ativo.");
      return;
    }
    router.refresh();
  }

  async function updateDebtPaid(id: number, value: string) {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) return;
    const response = await fetch(`/api/debts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountPaid: next })
    });
    if (!response.ok) {
      setMsg("Falha ao atualizar dívida.");
      return;
    }
    router.refresh();
  }

  async function removeAsset(id: number) {
    if (!window.confirm("Queres anular este ativo?")) return;
    const response = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setMsg("Falha ao anular ativo.");
      return;
    }
    router.refresh();
  }

  async function removeDebt(id: number) {
    if (!window.confirm("Queres anular esta dívida?")) return;
    const response = await fetch(`/api/debts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setMsg("Falha ao anular dívida.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="wealth-grid">
      <article className="panel">
        <div className="panel-head">
          <h3>Ativos</h3>
        </div>
        {periodLabel ? <p className="budgets-period-label">{periodLabel}</p> : null}
        <form className="recurring-form" onSubmit={createAsset}>
          <div className="q-grid">
            <label className="q-field">
              <span>Nome</span>
              <input value={assetName} onChange={(e) => setAssetName(e.target.value)} required />
            </label>
            <label className="q-field">
              <span>Tipo</span>
              <input value={assetType} onChange={(e) => setAssetType(e.target.value)} required />
            </label>
          </div>
          <label className="q-field">
            <span>Valor</span>
            <input type="number" min="0" step="0.01" value={assetValue} onChange={(e) => setAssetValue(e.target.value)} required />
          </label>
          <div className="recurring-actions">
            <button type="submit" disabled={loading}>
              {loading ? "A guardar..." : "Guardar ativo"}
            </button>
          </div>
        </form>

        <ul className="goals-list wealth-list">
          {assets.length ? (
            assets.map((asset) => (
              <li key={asset.id}>
                <div className="goals-top-row">
                  <div>
                    <b>{asset.name}</b>
                    <p>{asset.assetType}</p>
                  </div>
                  <strong className="money-in">{formatMoney(asset.value, lang, currency)}</strong>
                </div>
                <div className="goals-actions-row">
                  <label className="q-field">
                    <span>Atualizar valor</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={asset.value.toString()}
                      onBlur={(e) => updateAssetValue(asset.id, e.target.value)}
                    />
                  </label>
                  <button type="button" className="activity-delete-btn" onClick={() => removeAsset(asset.id)}>
                    Anular
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="recurring-empty">Sem ativos registados.</li>
          )}
        </ul>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h3>Dívidas</h3>
        </div>
        {periodLabel ? <p className="budgets-period-label">{periodLabel}</p> : null}
        <form className="recurring-form" onSubmit={createDebt}>
          <label className="q-field">
            <span>Nome</span>
            <input value={debtName} onChange={(e) => setDebtName(e.target.value)} required />
          </label>
          <div className="q-grid">
            <label className="q-field">
              <span>Total em dívida</span>
              <input type="number" min="0" step="0.01" value={debtTotal} onChange={(e) => setDebtTotal(e.target.value)} required />
            </label>
            <label className="q-field">
              <span>Já pago</span>
              <input type="number" min="0" step="0.01" value={debtPaid} onChange={(e) => setDebtPaid(e.target.value)} />
            </label>
          </div>
          <label className="q-field">
            <span>Juro %</span>
            <input type="number" min="0" max="100" step="0.01" value={debtRate} onChange={(e) => setDebtRate(e.target.value)} />
          </label>
          <div className="recurring-actions">
            <button type="submit" disabled={loading}>
              {loading ? "A guardar..." : "Guardar dívida"}
            </button>
          </div>
        </form>

        <ul className="goals-list wealth-list">
          {debts.length ? (
            debts.map((debt) => {
              const pending = Math.max(0, debt.totalOwed - debt.amountPaid);
              return (
                <li key={debt.id}>
                  <div className="goals-top-row">
                    <div>
                      <b>{debt.name}</b>
                      <p>Juro {debt.interestRate.toFixed(2)}%</p>
                    </div>
                    <strong className="money-out">{formatMoney(pending, lang, currency)}</strong>
                  </div>
                  <div className="goals-actions-row">
                    <label className="q-field">
                      <span>Atualizar já pago</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={debt.amountPaid.toString()}
                        onBlur={(e) => updateDebtPaid(debt.id, e.target.value)}
                      />
                    </label>
                    <button type="button" className="activity-delete-btn" onClick={() => removeDebt(debt.id)}>
                      Anular
                    </button>
                  </div>
                </li>
              );
            })
          ) : (
            <li className="recurring-empty">Sem dívidas registadas.</li>
          )}
        </ul>
      </article>

      {msg ? <p className="q-msg">{msg}</p> : null}
    </div>
  );
}

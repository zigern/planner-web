"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BillItem = {
  id: number;
  name: string;
  amount: number;
  dueDay: number;
  frequency: "monthly" | "quarterly" | "yearly";
  autoPay: boolean;
  status: "pending" | "paid";
};

type SubscriptionItem = {
  id: number;
  service: string;
  cost: number;
  billingCycle: "monthly" | "yearly";
  category: string;
  status: "active" | "paused" | "cancelled";
};

type Dict = {
  billsTitle: string;
  billsSubtitle: string;
  subTitle: string;
  subSubtitle: string;
  addBill: string;
  addSub: string;
  name: string;
  amount: string;
  dueDay: string;
  frequency: string;
  autoPay: string;
  monthly: string;
  quarterly: string;
  yearly: string;
  service: string;
  cost: string;
  billingCycle: string;
  category: string;
  save: string;
  saving: string;
  remove: string;
  totalMonthlyBills: string;
  totalMonthlySubs: string;
  noBills: string;
  noSubs: string;
};

const textByLang: Record<string, Dict> = {
  "pt-PT": {
    billsTitle: "Contas fixas",
    billsSubtitle: "Rendas, luz, água, internet e outras contas recorrentes",
    subTitle: "Subscrições",
    subSubtitle: "Netflix, Spotify, ferramentas e apps",
    addBill: "Adicionar conta",
    addSub: "Adicionar subscrição",
    name: "Nome",
    amount: "Valor",
    dueDay: "Dia vencimento",
    frequency: "Frequência",
    autoPay: "Auto-pay",
    monthly: "Mensal",
    quarterly: "Trimestral",
    yearly: "Anual",
    service: "Serviço",
    cost: "Custo",
    billingCycle: "Ciclo",
    category: "Categoria",
    save: "Guardar",
    saving: "A guardar...",
    remove: "Remover",
    totalMonthlyBills: "Total mensal contas",
    totalMonthlySubs: "Total mensal subscrições",
    noBills: "Sem contas fixas registadas.",
    noSubs: "Sem subscrições registadas."
  },
  "en-US": {
    billsTitle: "Bills",
    billsSubtitle: "Rent, utilities, internet, and fixed commitments",
    subTitle: "Subscriptions",
    subSubtitle: "Streaming, software, and recurring apps",
    addBill: "Add bill",
    addSub: "Add subscription",
    name: "Name",
    amount: "Amount",
    dueDay: "Due day",
    frequency: "Frequency",
    autoPay: "Auto-pay",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    service: "Service",
    cost: "Cost",
    billingCycle: "Cycle",
    category: "Category",
    save: "Save",
    saving: "Saving...",
    remove: "Remove",
    totalMonthlyBills: "Monthly bills total",
    totalMonthlySubs: "Monthly subscriptions total",
    noBills: "No fixed bills yet.",
    noSubs: "No subscriptions yet."
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

export function BillsSubscriptionsManager({
  lang,
  currency,
  initialBills,
  initialSubscriptions
}: {
  lang: string;
  currency: string;
  initialBills: BillItem[];
  initialSubscriptions: SubscriptionItem[];
}) {
  const router = useRouter();
  const t = textByLang[lang] || textByLang["en-US"];

  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDay, setBillDueDay] = useState("1");
  const [billFrequency, setBillFrequency] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [billAutoPay, setBillAutoPay] = useState(false);
  const [billLoading, setBillLoading] = useState(false);

  const [subService, setSubService] = useState("");
  const [subCost, setSubCost] = useState("");
  const [subCycle, setSubCycle] = useState<"monthly" | "yearly">("monthly");
  const [subCategory, setSubCategory] = useState("Software");
  const [subLoading, setSubLoading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  const monthlyBillsTotal = useMemo(
    () =>
      initialBills.reduce((sum, item) => {
        const base = Number(item.amount || 0);
        if (item.frequency === "monthly") return sum + base;
        if (item.frequency === "quarterly") return sum + base / 3;
        return sum + base / 12;
      }, 0),
    [initialBills]
  );

  const monthlySubsTotal = useMemo(
    () =>
      initialSubscriptions.reduce((sum, item) => {
        const base = Number(item.cost || 0);
        if (item.billingCycle === "monthly") return sum + base;
        return sum + base / 12;
      }, 0),
    [initialSubscriptions]
  );

  async function createBill(e: React.FormEvent) {
    e.preventDefault();
    if (billLoading) return;
    setBillLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: billName,
          amount: Number(billAmount),
          dueDay: Number(billDueDay),
          frequency: billFrequency,
          autoPay: billAutoPay
        })
      });

      if (!response.ok) {
        setMessage("Could not save bill.");
        return;
      }

      setBillName("");
      setBillAmount("");
      setBillDueDay("1");
      setBillFrequency("monthly");
      setBillAutoPay(false);
      setMessage("Bill saved.");
      router.refresh();
    } finally {
      setBillLoading(false);
    }
  }

  async function createSubscription(e: React.FormEvent) {
    e.preventDefault();
    if (subLoading) return;
    setSubLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: subService,
          cost: Number(subCost),
          billingCycle: subCycle,
          category: subCategory
        })
      });

      if (!response.ok) {
        setMessage("Could not save subscription.");
        return;
      }

      setSubService("");
      setSubCost("");
      setSubCycle("monthly");
      setSubCategory("Software");
      setMessage("Subscription saved.");
      router.refresh();
    } finally {
      setSubLoading(false);
    }
  }

  async function removeBill(id: number) {
    const response = await fetch(`/api/bills/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    router.refresh();
  }

  async function removeSubscription(id: number) {
    const response = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    router.refresh();
  }

  return (
    <section className="bills-grid">
      <article className="panel bills-panel">
        <div className="panel-head">
          <h3>{t.billsTitle}</h3>
        </div>
        <p className="sub-copy">{t.billsSubtitle}</p>
        <p className="delta up">
          {t.totalMonthlyBills}: {formatMoney(monthlyBillsTotal, lang, currency)}
        </p>

        <form className="quick-form" onSubmit={createBill}>
          <div className="q-grid">
            <label className="q-field">
              <span>{t.name}</span>
              <input value={billName} onChange={(e) => setBillName(e.target.value)} required />
            </label>
            <label className="q-field">
              <span>{t.amount}</span>
              <input type="number" min="0.01" step="0.01" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} required />
            </label>
          </div>
          <div className="q-grid">
            <label className="q-field">
              <span>{t.dueDay}</span>
              <input type="number" min="1" max="31" value={billDueDay} onChange={(e) => setBillDueDay(e.target.value)} required />
            </label>
            <label className="q-field">
              <span>{t.frequency}</span>
              <select value={billFrequency} onChange={(e) => setBillFrequency(e.target.value as "monthly" | "quarterly" | "yearly")}>
                <option value="monthly">{t.monthly}</option>
                <option value="quarterly">{t.quarterly}</option>
                <option value="yearly">{t.yearly}</option>
              </select>
            </label>
          </div>
          <label className="q-check-inline">
            <input type="checkbox" checked={billAutoPay} onChange={(e) => setBillAutoPay(e.target.checked)} /> {t.autoPay}
          </label>
          <button type="submit" disabled={billLoading}>{billLoading ? t.saving : t.addBill}</button>
        </form>

        <ul className="bills-list">
          {initialBills.length ? (
            initialBills.map((bill) => (
              <li key={bill.id}>
                <div>
                  <b>{bill.name}</b>
                  <p>{t.dueDay} {bill.dueDay} • {bill.frequency}</p>
                </div>
                <strong>{formatMoney(bill.amount, lang, currency)}</strong>
                <button type="button" onClick={() => removeBill(bill.id)}>{t.remove}</button>
              </li>
            ))
          ) : (
            <li className="recurring-empty">{t.noBills}</li>
          )}
        </ul>
      </article>

      <article className="panel bills-panel">
        <div className="panel-head">
          <h3>{t.subTitle}</h3>
        </div>
        <p className="sub-copy">{t.subSubtitle}</p>
        <p className="delta up">
          {t.totalMonthlySubs}: {formatMoney(monthlySubsTotal, lang, currency)}
        </p>

        <form className="quick-form" onSubmit={createSubscription}>
          <div className="q-grid">
            <label className="q-field">
              <span>{t.service}</span>
              <input value={subService} onChange={(e) => setSubService(e.target.value)} required />
            </label>
            <label className="q-field">
              <span>{t.cost}</span>
              <input type="number" min="0.01" step="0.01" value={subCost} onChange={(e) => setSubCost(e.target.value)} required />
            </label>
          </div>
          <div className="q-grid">
            <label className="q-field">
              <span>{t.billingCycle}</span>
              <select value={subCycle} onChange={(e) => setSubCycle(e.target.value as "monthly" | "yearly") }>
                <option value="monthly">{t.monthly}</option>
                <option value="yearly">{t.yearly}</option>
              </select>
            </label>
            <label className="q-field">
              <span>{t.category}</span>
              <input value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required />
            </label>
          </div>
          <button type="submit" disabled={subLoading}>{subLoading ? t.saving : t.addSub}</button>
        </form>

        <ul className="bills-list">
          {initialSubscriptions.length ? (
            initialSubscriptions.map((sub) => (
              <li key={sub.id}>
                <div>
                  <b>{sub.service}</b>
                  <p>{sub.category} • {sub.billingCycle}</p>
                </div>
                <strong>{formatMoney(sub.cost, lang, currency)}</strong>
                <button type="button" onClick={() => removeSubscription(sub.id)}>{t.remove}</button>
              </li>
            ))
          ) : (
            <li className="recurring-empty">{t.noSubs}</li>
          )}
        </ul>
      </article>

      {message ? <p className="q-msg">{message}</p> : null}
    </section>
  );
}

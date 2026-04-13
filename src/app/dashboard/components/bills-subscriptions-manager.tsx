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
  update: string;
  updating: string;
  status: string;
  pending: string;
  paid: string;
  active: string;
  paused: string;
  cancelled: string;
  totalMonthlyBills: string;
  totalMonthlySubs: string;
  noBills: string;
  noSubs: string;
  billSaved: string;
  subSaved: string;
  billSaveFail: string;
  subSaveFail: string;
  overdueCount: string;
  overdueAmount: string;
  upcoming7d: string;
  quickPay: string;
  noAlerts: string;
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
    update: "Atualizar",
    updating: "A atualizar...",
    status: "Estado",
    pending: "Pendente",
    paid: "Pago",
    active: "Ativa",
    paused: "Pausada",
    cancelled: "Cancelada",
    totalMonthlyBills: "Total mensal contas",
    totalMonthlySubs: "Total mensal subscrições",
    noBills: "Sem contas fixas registadas.",
    noSubs: "Sem subscrições registadas.",
    billSaved: "Conta guardada.",
    subSaved: "Subscrição guardada.",
    billSaveFail: "Não foi possível guardar a conta.",
    subSaveFail: "Não foi possível guardar a subscrição.",
    overdueCount: "Contas vencidas",
    overdueAmount: "Valor em atraso",
    upcoming7d: "Vencem nos próximos 7 dias",
    quickPay: "Marcar pago",
    noAlerts: "Sem alertas de vencimento neste momento."
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
    update: "Update",
    updating: "Updating...",
    status: "Status",
    pending: "Pending",
    paid: "Paid",
    active: "Active",
    paused: "Paused",
    cancelled: "Cancelled",
    totalMonthlyBills: "Monthly bills total",
    totalMonthlySubs: "Monthly subscriptions total",
    noBills: "No fixed bills yet.",
    noSubs: "No subscriptions yet.",
    billSaved: "Bill saved.",
    subSaved: "Subscription saved.",
    billSaveFail: "Could not save bill.",
    subSaveFail: "Could not save subscription.",
    overdueCount: "Overdue bills",
    overdueAmount: "Overdue amount",
    upcoming7d: "Due in next 7 days",
    quickPay: "Mark paid",
    noAlerts: "No due-date alerts right now."
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
  const [updatingBillId, setUpdatingBillId] = useState<number | null>(null);
  const [updatingSubId, setUpdatingSubId] = useState<number | null>(null);

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

  const today = new Date().getDate();
  const pendingBills = useMemo(() => initialBills.filter((bill) => bill.status === "pending"), [initialBills]);
  const overdueBills = useMemo(() => pendingBills.filter((bill) => bill.dueDay < today), [pendingBills, today]);
  const upcomingBills = useMemo(
    () => pendingBills.filter((bill) => bill.dueDay >= today && bill.dueDay <= Math.min(today + 7, 31)),
    [pendingBills, today]
  );
  const overdueTotal = useMemo(
    () => overdueBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0),
    [overdueBills]
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
        setMessage(t.billSaveFail);
        return;
      }

      setBillName("");
      setBillAmount("");
      setBillDueDay("1");
      setBillFrequency("monthly");
      setBillAutoPay(false);
      setMessage(t.billSaved);
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
        setMessage(t.subSaveFail);
        return;
      }

      setSubService("");
      setSubCost("");
      setSubCycle("monthly");
      setSubCategory("Software");
      setMessage(t.subSaved);
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

  async function updateBillStatus(id: number, status: "pending" | "paid") {
    setUpdatingBillId(id);
    try {
      const response = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) return;
      router.refresh();
    } finally {
      setUpdatingBillId(null);
    }
  }

  async function updateSubscriptionStatus(id: number, status: "active" | "paused" | "cancelled") {
    setUpdatingSubId(id);
    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) return;
      router.refresh();
    } finally {
      setUpdatingSubId(null);
    }
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

        <div className="bill-alerts">
          <div className="bill-alert-card overdue">
            <span>{t.overdueCount}</span>
            <strong>{overdueBills.length}</strong>
          </div>
          <div className="bill-alert-card danger">
            <span>{t.overdueAmount}</span>
            <strong>{formatMoney(overdueTotal, lang, currency)}</strong>
          </div>
          <div className="bill-alert-card upcoming">
            <span>{t.upcoming7d}</span>
            <strong>{upcomingBills.length}</strong>
          </div>
        </div>

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
              <li key={bill.id} className={bill.status === "pending" && bill.dueDay < today ? "bill-overdue" : ""}>
                <div>
                  <b>{bill.name}</b>
                  <p>{t.dueDay} {bill.dueDay} • {bill.frequency}</p>
                </div>
                <strong>{formatMoney(bill.amount, lang, currency)}</strong>
                <div className="bills-actions">
                  <select
                    aria-label={t.status}
                    value={bill.status}
                    disabled={updatingBillId === bill.id}
                    onChange={(e) => updateBillStatus(bill.id, e.target.value as "pending" | "paid")}
                  >
                    <option value="pending">{t.pending}</option>
                    <option value="paid">{t.paid}</option>
                  </select>
                  {bill.status === "pending" ? (
                    <button type="button" onClick={() => updateBillStatus(bill.id, "paid")}>
                      {t.quickPay}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => removeBill(bill.id)}>{t.remove}</button>
                </div>
              </li>
            ))
          ) : (
            <li className="recurring-empty">{t.noBills}</li>
          )}
        </ul>
        {!overdueBills.length && !upcomingBills.length ? <p className="sub-copy">{t.noAlerts}</p> : null}
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
                <div className="bills-actions">
                  <select
                    aria-label={t.status}
                    value={sub.status}
                    disabled={updatingSubId === sub.id}
                    onChange={(e) =>
                      updateSubscriptionStatus(sub.id, e.target.value as "active" | "paused" | "cancelled")
                    }
                  >
                    <option value="active">{t.active}</option>
                    <option value="paused">{t.paused}</option>
                    <option value="cancelled">{t.cancelled}</option>
                  </select>
                  <button type="button" onClick={() => removeSubscription(sub.id)}>{t.remove}</button>
                </div>
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

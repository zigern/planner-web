"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoneyConverted } from "@/lib/currency-conversion";

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
  renewalDate: string | null;
};

type Dict = {
  summaryTitle: string;
  addItemsTitle: string;
  recordsTitle: string;
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
  renewalDate: string;
  renewalsNext7d: string;
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
    summaryTitle: "Resumo de contas e subscrições",
    addItemsTitle: "Adicionar novos registos",
    recordsTitle: "Registos do período",
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
    renewalDate: "Renovação",
    renewalsNext7d: "Renovações próximos 7 dias",
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
    summaryTitle: "Bills and subscriptions overview",
    addItemsTitle: "Add new entries",
    recordsTitle: "Period records",
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
    renewalDate: "Renewal date",
    renewalsNext7d: "Renewals in next 7 days",
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
  return formatMoneyConverted(value, lang, currency, 2);
}

function formatOptionalDate(value: string | null, lang: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(lang);
}

export function BillsSubscriptionsManager({
  lang,
  currency,
  initialBills,
  initialSubscriptions,
  periodFrom,
  periodTo,
  periodLabel
}: {
  lang: string;
  currency: string;
  initialBills: BillItem[];
  initialSubscriptions: SubscriptionItem[];
  periodFrom: string;
  periodTo: string;
  periodLabel?: string;
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
  const [subRenewalDate, setSubRenewalDate] = useState("");
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
  const renewalsInPeriod = useMemo(() => {
    const start = new Date(`${periodFrom}T00:00:00`);
    const end = new Date(`${periodTo}T23:59:59`);
    return initialSubscriptions.filter((sub) => {
      if (!sub.renewalDate) return false;
      const renewal = new Date(sub.renewalDate);
      return !Number.isNaN(renewal.getTime()) && renewal >= start && renewal <= end;
    });
  }, [initialSubscriptions, periodFrom, periodTo]);

  const anchorDay = Number(periodTo.slice(-2)) || new Date().getDate();
  const pendingBills = useMemo(() => initialBills.filter((bill) => bill.status === "pending"), [initialBills]);
  const overdueBills = useMemo(() => pendingBills.filter((bill) => bill.dueDay < anchorDay), [pendingBills, anchorDay]);
  const upcomingBills = useMemo(
    () => pendingBills.filter((bill) => bill.dueDay >= anchorDay && bill.dueDay <= Math.min(anchorDay + 7, 31)),
    [pendingBills, anchorDay]
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
          category: subCategory,
          renewalDate: subRenewalDate || undefined
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
      setSubRenewalDate("");
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
      <article className="panel bills-overview-panel">
        <div className="panel-head">
          <h3>{t.summaryTitle}</h3>
        </div>
        {periodLabel ? <p className="budgets-period-label">{periodLabel}</p> : null}
        <div className="bill-alerts bill-alerts--overview">
          <div className="bill-alert-card total">
            <span>{t.totalMonthlyBills}</span>
            <strong>{formatMoney(monthlyBillsTotal, lang, currency)}</strong>
          </div>
          <div className="bill-alert-card total">
            <span>{t.totalMonthlySubs}</span>
            <strong>{formatMoney(monthlySubsTotal, lang, currency)}</strong>
          </div>
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
        {!overdueBills.length && !upcomingBills.length ? <p className="sub-copy">{t.noAlerts}</p> : null}
      </article>

      <article className="panel bills-entry-panel">
        <div className="panel-head">
          <h3>{t.addItemsTitle}</h3>
        </div>
        <div className="bills-entry-grid">
          <section className="bills-form-block">
            <h4>{t.addBill}</h4>
            <p className="sub-copy">{t.billsSubtitle}</p>
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
          </section>

          <section className="bills-form-block">
            <h4>{t.addSub}</h4>
            <p className="sub-copy">{t.subSubtitle}</p>
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
              <label className="q-field">
                <span>{t.renewalDate}</span>
                <input type="date" value={subRenewalDate} onChange={(e) => setSubRenewalDate(e.target.value)} />
              </label>
              <button type="submit" disabled={subLoading}>{subLoading ? t.saving : t.addSub}</button>
            </form>
          </section>
        </div>
        {message ? <p className="q-msg">{message}</p> : null}
      </article>

      <article className="panel bills-records-panel">
        <div className="panel-head">
          <h3>{t.recordsTitle}</h3>
        </div>
        <div className="bills-records-grid">
          <section className="bills-list-block">
            <div className="bills-list-head">
              <h4>{t.billsTitle}</h4>
              <p className="delta up">{formatMoney(monthlyBillsTotal, lang, currency)}</p>
            </div>
            <ul className="bills-list">
              {initialBills.length ? (
                initialBills.map((bill) => (
                  <li key={bill.id} className={bill.status === "pending" && bill.dueDay < anchorDay ? "bill-overdue" : ""}>
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
          </section>

          <section className="bills-list-block">
            <div className="bills-list-head">
              <h4>{t.subTitle}</h4>
              <p className="delta">{t.renewalsNext7d}: {renewalsInPeriod.length}</p>
            </div>
            <ul className="bills-list">
              {initialSubscriptions.length ? (
                initialSubscriptions.map((sub) => (
                  <li key={sub.id}>
                    <div>
                      <b>{sub.service}</b>
                      <p>
                        {sub.category} • {sub.billingCycle}
                        {sub.renewalDate ? ` • ${t.renewalDate}: ${formatOptionalDate(sub.renewalDate, lang)}` : ""}
                      </p>
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
          </section>
        </div>
      </article>
    </section>
  );
}

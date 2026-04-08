"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormMessage = {
  text: string;
  ok: boolean;
} | null;

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || "Falha ao gravar.");
  }
}

export function AddBillForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [autoPay, setAutoPay] = useState(false);
  const [message, setMessage] = useState<FormMessage>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await postJson("/api/bills", {
        name,
        amount: Number(amount),
        dueDay: Number(dueDay),
        frequency,
        autoPay
      });
      setName("");
      setAmount("");
      setDueDay("1");
      setFrequency("monthly");
      setAutoPay(false);
      setMessage({ ok: true, text: "Conta fixa adicionada." });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Erro." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 rounded-lg border border-white/10 p-3">
      <h3 className="text-sm font-semibold">Adicionar conta fixa</h3>
      <input
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
          required
        />
        <input
          type="number"
          min="1"
          max="31"
          placeholder="Dia"
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as "monthly" | "quarterly" | "yearly")}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
        >
          <option value="monthly">Mensal</option>
          <option value="quarterly">Trimestral</option>
          <option value="yearly">Anual</option>
        </select>
        <label className="flex items-center gap-2 rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm">
          <input type="checkbox" checked={autoPay} onChange={(e) => setAutoPay(e.target.checked)} />
          Auto-pay
        </label>
      </div>
      <button
        disabled={loading}
        className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "A gravar..." : "Guardar"}
      </button>
      {message ? <p className={`text-xs ${message.ok ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</p> : null}
    </form>
  );
}

export function AddSubscriptionForm() {
  const router = useRouter();
  const [service, setService] = useState("");
  const [cost, setCost] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [category, setCategory] = useState("Software");
  const [message, setMessage] = useState<FormMessage>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await postJson("/api/subscriptions", {
        service,
        cost: Number(cost),
        billingCycle,
        category
      });
      setService("");
      setCost("");
      setCategory("Software");
      setBillingCycle("monthly");
      setMessage({ ok: true, text: "Subscrição adicionada." });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Erro." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 rounded-lg border border-white/10 p-3">
      <h3 className="text-sm font-semibold">Adicionar subscrição</h3>
      <input
        placeholder="Serviço"
        value={service}
        onChange={(e) => setService(e.target.value)}
        className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Custo"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
          required
        />
        <select
          value={billingCycle}
          onChange={(e) => setBillingCycle(e.target.value as "monthly" | "yearly")}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
        >
          <option value="monthly">Mensal</option>
          <option value="yearly">Anual</option>
        </select>
      </div>
      <input
        placeholder="Categoria"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
        required
      />
      <button
        disabled={loading}
        className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "A gravar..." : "Guardar"}
      </button>
      {message ? <p className={`text-xs ${message.ok ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</p> : null}
    </form>
  );
}

export function AddGoalForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [message, setMessage] = useState<FormMessage>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await postJson("/api/goals", {
        name,
        targetAmount: Number(targetAmount),
        savedAmount: Number(savedAmount || 0),
        deadline: deadline || undefined,
        status: "in_progress"
      });
      setName("");
      setTargetAmount("");
      setSavedAmount("");
      setDeadline("");
      setMessage({ ok: true, text: "Objetivo adicionado." });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Erro." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 rounded-lg border border-white/10 p-3">
      <h3 className="text-sm font-semibold">Adicionar objetivo</h3>
      <input
        placeholder="Nome do objetivo"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Objetivo €"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
          required
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Poupado €"
          value={savedAmount}
          onChange={(e) => setSavedAmount(e.target.value)}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
        />
      </div>
      <input
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
      />
      <button
        disabled={loading}
        className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "A gravar..." : "Guardar"}
      </button>
      {message ? <p className={`text-xs ${message.ok ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</p> : null}
    </form>
  );
}

export function AddDebtForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [totalOwed, setTotalOwed] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [message, setMessage] = useState<FormMessage>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await postJson("/api/debts", {
        name,
        totalOwed: Number(totalOwed),
        amountPaid: Number(amountPaid || 0),
        interestRate: Number(interestRate || 0)
      });
      setName("");
      setTotalOwed("");
      setAmountPaid("");
      setInterestRate("");
      setMessage({ ok: true, text: "Dívida adicionada." });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Erro." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 rounded-lg border border-white/10 p-3">
      <h3 className="text-sm font-semibold">Adicionar dívida</h3>
      <input
        placeholder="Nome da dívida"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Total em dívida"
          value={totalOwed}
          onChange={(e) => setTotalOwed(e.target.value)}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
          required
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Já pago"
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
        />
      </div>
      <input
        type="number"
        min="0"
        max="100"
        step="0.01"
        placeholder="Juro %"
        value={interestRate}
        onChange={(e) => setInterestRate(e.target.value)}
        className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
      />
      <button
        disabled={loading}
        className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "A gravar..." : "Guardar"}
      </button>
      {message ? <p className={`text-xs ${message.ok ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</p> : null}
    </form>
  );
}

export function AddAssetForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("Savings");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<FormMessage>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await postJson("/api/assets", {
        name,
        assetType,
        value: Number(value)
      });
      setName("");
      setAssetType("Savings");
      setValue("");
      setMessage({ ok: true, text: "Ativo adicionado." });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Erro." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 rounded-lg border border-white/10 p-3">
      <h3 className="text-sm font-semibold">Adicionar ativo</h3>
      <input
        placeholder="Nome do ativo"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Tipo"
          value={assetType}
          onChange={(e) => setAssetType(e.target.value)}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
          required
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Valor"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
          required
        />
      </div>
      <button
        disabled={loading}
        className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "A gravar..." : "Guardar"}
      </button>
      {message ? <p className={`text-xs ${message.ok ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</p> : null}
    </form>
  );
}

export function AddBudgetForm({ month }: { month: string }) {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<FormMessage>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await postJson("/api/budgets", {
        month,
        category,
        amount: Number(amount)
      });
      setCategory("");
      setAmount("");
      setMessage({ ok: true, text: "Orçamento guardado." });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Erro." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 rounded-lg border border-white/10 p-3">
      <h3 className="text-sm font-semibold">Orçamento mensal ({month})</h3>
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
          required
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Valor orçamento"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-md border border-white/15 bg-[#171717] text-slate-100 placeholder:text-slate-500 px-3 py-2 text-sm"
          required
        />
      </div>
      <button
        disabled={loading}
        className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "A gravar..." : "Guardar"}
      </button>
      {message ? <p className={`text-xs ${message.ok ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</p> : null}
    </form>
  );
}

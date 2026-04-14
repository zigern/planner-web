"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const expenseCategories = ["Housing", "Personal", "Transportation", "Food", "Bills", "Pets", "Health", "Shopping", "Other"];

const incomeCategories = ["Salary", "Freelance", "Business", "Investments", "Bonus", "Other"];

const expenseItemsByCategory: Record<string, string[]> = {
  Housing: ["Rent", "Utilities", "Internet", "Condo", "Insurance", "Other"],
  Personal: ["Shopping", "Leisure", "Clothing", "Beauty", "Other"],
  Transportation: ["Fuel", "Transport Pass", "Parking", "Ride Apps", "Car Maintenance", "Other"],
  Food: ["Groceries", "Restaurant", "Coffee", "Snacks", "Other"],
  Bills: ["Electricity", "Water", "Phone", "Netflix", "Gym", "Other"],
  Pets: ["Pet Food", "Vet", "Grooming", "Toys", "Other"],
  Health: ["Pharmacy", "Doctor", "Insurance", "Supplements", "Other"],
  Shopping: ["Online Shopping", "Store Shopping", "Gifts", "Other"],
  Other: ["Other"]
};

const incomeItems = ["Salary", "Freelance", "Bonus", "Business", "Other"];

function categoryIconKind(name: string) {
  const value = name.trim().toLowerCase();
  if (/(housing|habita|home|house|rent|mortgage|utilities|bills|contas)/i.test(value)) return "home";
  if (/(transport|car|fuel|uber|parking|trip)/i.test(value)) return "car";
  if (/(food|dining|restaurant|comida)/i.test(value)) return "food";
  if (/(shopping|store|compras)/i.test(value)) return "bag";
  if (/(health|saude|doctor|pharmacy)/i.test(value)) return "plus";
  if (/(pets|animais|pet|dog|cat|vet)/i.test(value)) return "paw";
  if (/(salary|income|business|investments|bonus|freelance|receita|renda)/i.test(value)) return "income";
  return "dot";
}

function CategoryIcon({ kind }: { kind: string }) {
  if (kind === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.5 12 5l8 6.5V20h-5v-5h-6v5H4z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "car") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 13 7.5 8h9L19 13v6h-2a2 2 0 0 1-4 0h-2a2 2 0 0 1-4 0H5z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "food") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h2v8a2 2 0 0 1-2 2zM10 3h2v8a2 2 0 0 1-2 2zM17 3h2v18h-2z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "bag") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 8h12l-1 11H7z" fill="currentColor" />
        <path d="M9 8V6a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (kind === "plus") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "paw") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="7" cy="8" r="2" fill="currentColor" />
        <circle cx="12" cy="6.8" r="2" fill="currentColor" />
        <circle cx="17" cy="8" r="2" fill="currentColor" />
        <path d="M6 16a6 4.6 0 0 1 12 0c0 2.2-2.2 3.6-6 3.6S6 18.2 6 16Z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "income") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 20V8.8L7.4 12.4 6 11l6-6 6 6-1.4 1.4L13 8.8V20z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6" fill="currentColor" />
    </svg>
  );
}

  const uiByLang = {
    "pt-PT": {
      mode: "Modo",
      modeNormal: "Normal",
      modeRecurring: "Recorrente",
      type: "Tipo",
      category: "Categoria",
      item: "Item",
      date: "Data",
      expense: "Despesa",
      income: "Receita",
      amount: "Valor",
    add: "Adicionar",
    saving: "A guardar...",
    saved: "Transação guardada.",
    savedRecurring: "Transação + regra mensal guardadas.",
    failed: "Falha ao guardar.",
    fixedIncome: "Entrada fixa mensal",
    fixedExpense: "Despesa fixa mensal"
    },
    "en-US": {
      mode: "Mode",
      modeNormal: "Normal",
      modeRecurring: "Recurring",
      type: "Type",
      category: "Category",
      item: "Item",
      date: "Date",
      expense: "Expense",
      income: "Income",
      amount: "Amount",
    add: "Add",
    saving: "Saving...",
    saved: "Transaction saved.",
    savedRecurring: "Transaction + monthly rule saved.",
    failed: "Failed to save.",
    fixedIncome: "Fixed monthly income",
    fixedExpense: "Fixed monthly expense"
    },
    "es-ES": {
      mode: "Modo",
      modeNormal: "Normal",
      modeRecurring: "Recurrente",
      type: "Tipo",
      category: "Categoría",
      item: "Concepto",
      date: "Fecha",
      expense: "Gasto",
      income: "Ingreso",
      amount: "Importe",
    add: "Añadir",
    saving: "Guardando...",
    saved: "Transacción guardada.",
    savedRecurring: "Transacción + regla mensual guardadas.",
    failed: "Error al guardar.",
    fixedIncome: "Ingreso fijo mensual",
    fixedExpense: "Gasto fijo mensual"
    },
    "fr-FR": {
      mode: "Mode",
      modeNormal: "Normal",
      modeRecurring: "Récurrent",
      type: "Type",
      category: "Catégorie",
      item: "Élément",
      date: "Date",
      expense: "Dépense",
      income: "Revenu",
      amount: "Montant",
    add: "Ajouter",
    saving: "Enregistrement...",
    saved: "Transaction enregistrée.",
    savedRecurring: "Transaction + règle mensuelle enregistrées.",
    failed: "Échec de l'enregistrement.",
    fixedIncome: "Revenu fixe mensuel",
    fixedExpense: "Dépense fixe mensuelle"
  }
} as const;

const categoryLabelByLang = {
  "pt-PT": {
    Housing: "Habitação",
    Personal: "Pessoal",
    Transportation: "Transporte",
    Food: "Comida",
    Bills: "Contas",
    Pets: "Animais",
    Health: "Saúde",
    Shopping: "Compras",
    Other: "Outros",
    Salary: "Salário",
    Freelance: "Freelance",
    Business: "Negócio",
    Investments: "Investimentos",
    Bonus: "Bónus"
  },
  "en-US": {},
  "es-ES": {
    Housing: "Vivienda",
    Personal: "Personal",
    Transportation: "Transporte",
    Food: "Comida",
    Bills: "Facturas",
    Pets: "Mascotas",
    Health: "Salud",
    Shopping: "Compras",
    Other: "Otros",
    Salary: "Salario",
    Freelance: "Freelance",
    Business: "Negocio",
    Investments: "Inversiones",
    Bonus: "Bono"
  },
  "fr-FR": {
    Housing: "Logement",
    Personal: "Personnel",
    Transportation: "Transport",
    Food: "Alimentation",
    Bills: "Factures",
    Pets: "Animaux",
    Health: "Santé",
    Shopping: "Achats",
    Other: "Autres",
    Salary: "Salaire",
    Freelance: "Freelance",
    Business: "Business",
    Investments: "Investissements",
    Bonus: "Bonus"
  }
} as const;

export function QuickAddForm({ lang = "pt-PT" }: { lang?: string }) {
  const router = useRouter();
  const text = uiByLang[lang as keyof typeof uiByLang] || uiByLang["pt-PT"];
  const categoryLabels = categoryLabelByLang[lang as keyof typeof categoryLabelByLang] || categoryLabelByLang["pt-PT"];
  const [type, setType] = useState<"income" | "expense">("expense");
  const [entryMode, setEntryMode] = useState<"normal" | "recurring">("normal");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Housing");
  const [item, setItem] = useState(expenseItemsByCategory.Housing[0]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const categories = type === "income" ? incomeCategories : expenseCategories;
  const items = type === "income" ? incomeItems : expenseItemsByCategory[category] || expenseItemsByCategory.Other;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const parsedAmount = Number(amount);
      if (entryMode === "normal") {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            amount: parsedAmount,
            category: category.trim() || categories[0],
            description: "",
            transactionDate: date
          })
        });

        if (!response.ok) {
          setMessage(text.failed);
          setLoading(false);
          return;
        }
      } else {
        const recurringRes = await fetch("/api/recurring-rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type,
              amount: parsedAmount,
              category: category.trim() || categories[0],
              description: item,
              dayOfMonth: Math.min(28, Math.max(1, Number(date.slice(8, 10))))
            })
          });
        if (!recurringRes.ok) {
          setMessage(text.failed);
          setLoading(false);
          return;
        }
      }

      {
        setAmount("");
        setCategory(categories[0]);
        setItem(items[0]);
        setMessage(entryMode === "recurring" ? text.savedRecurring : text.saved);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="quick-form quick-form-compact" onSubmit={onSubmit}>
      <div className="q-grid">
        <label className="q-field">
          <span>{text.mode}</span>
          <select value={entryMode} onChange={(e) => setEntryMode(e.target.value as "normal" | "recurring")}>
            <option value="normal">{text.modeNormal}</option>
            <option value="recurring">{text.modeRecurring}</option>
          </select>
        </label>

        <label className="q-field">
          <span>{text.type}</span>
          <select
            value={type}
            onChange={(e) => {
              const nextType = e.target.value as "income" | "expense";
              setType(nextType);
              if (nextType === "income") {
                setCategory(incomeCategories[0]);
                setItem(incomeItems[0]);
              } else {
                const nextCategory = expenseCategories[0];
                setCategory(nextCategory);
                setItem((expenseItemsByCategory[nextCategory] || expenseItemsByCategory.Other)[0]);
              }
            }}
          >
            <option value="expense">{text.expense}</option>
            <option value="income">{text.income}</option>
          </select>
        </label>

        <div className="q-field q-field-category">
          <span>{text.category}</span>
          <div className="category-tile-grid" role="listbox" aria-label={text.category}>
            {categories.map((cat) => {
              const iconKind = categoryIconKind(cat);
              const label = categoryLabels[cat as keyof typeof categoryLabels] || cat;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`category-tile ${category === cat ? "active" : ""}`}
                  title={label}
                  aria-label={label}
                  aria-pressed={category === cat}
                  onClick={() => {
                    setCategory(cat);
                    if (type === "expense") {
                      setItem((expenseItemsByCategory[cat] || expenseItemsByCategory.Other)[0]);
                    } else {
                      setItem(incomeItems[0]);
                    }
                  }}
                >
                  <span className={`category-tile-icon category-tile-icon-${iconKind}`}>
                    <CategoryIcon kind={iconKind} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {entryMode === "recurring" ? (
          <label className="q-field">
            <span>{text.item}</span>
            <select value={item} onChange={(e) => setItem(e.target.value)} key={`${type}-${category}`}>
              {items.map((opt) => (
                <option key={opt} value={opt}>
                  {categoryLabels[opt as keyof typeof categoryLabels] || opt}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="q-field">
          <span>{text.amount}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={text.amount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <label className="q-field">
          <span>{text.date}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>

      <div className="q-inline">
        <div className="q-check q-check-inline">
          {entryMode === "recurring"
            ? type === "income"
              ? text.fixedIncome
              : text.fixedExpense
            : type === "income"
              ? text.income
              : text.expense}
        </div>
        <button type="submit" className="q-submit-btn" disabled={loading}>
          {loading ? text.saving : text.add}
        </button>
      </div>

      {message ? <p className="q-msg">{message}</p> : null}
    </form>
  );
}

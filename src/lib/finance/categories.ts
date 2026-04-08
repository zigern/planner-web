export const INCOME_CATEGORIES = [
  "Salário",
  "Freelance",
  "Negócio",
  "Investimentos",
  "Bónus",
  "Outros"
] as const;

export const EXPENSE_CATEGORIES = [
  "Renda",
  "Comida",
  "Transporte",
  "Contas",
  "Saúde",
  "Lazer",
  "Compras",
  "Educação",
  "Outros"
] as const;

export function getCategoriesForType(type: "income" | "expense") {
  return type === "income" ? [...INCOME_CATEGORIES] : [...EXPENSE_CATEGORIES];
}

function normalizeValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const categoryAliases: Record<string, string[]> = {
  housing: ["housing", "habitacao", "habitação", "rent", "mortgage", "home", "house", "utilities"],
  personal: ["personal", "pessoal"],
  transportation: ["transportation", "transport", "transporte", "car", "fuel", "parking", "uber", "trip"],
  food: ["food", "comida", "dining", "restaurant"],
  bills: ["bills", "contas", "utilities"],
  pets: ["pets", "animais", "pet", "animal", "vet"],
  health: ["health", "saude", "saúde", "doctor", "pharmacy"],
  shopping: ["shopping", "compras", "store"],
  entertainment: ["entertainment", "entretenimento", "fun", "games", "movies"],
  other: ["other", "others", "outros", "outro", "misc"]
};

const labelsByLang: Record<string, { pt: string; en: string }> = {
  housing: { pt: "Habitação", en: "Housing" },
  personal: { pt: "Pessoal", en: "Personal" },
  transportation: { pt: "Transporte", en: "Transportation" },
  food: { pt: "Comida", en: "Food" },
  bills: { pt: "Contas", en: "Bills" },
  pets: { pt: "Animais", en: "Pets" },
  health: { pt: "Saúde", en: "Health" },
  shopping: { pt: "Compras", en: "Shopping" },
  entertainment: { pt: "Entretenimento", en: "Entertainment" },
  other: { pt: "Outros", en: "Other" }
};

function findCategoryKey(value: string) {
  const normalized = normalizeValue(value);
  for (const [key, aliases] of Object.entries(categoryAliases)) {
    if (aliases.some((alias) => normalizeValue(alias) === normalized)) {
      return key;
    }
  }
  return "";
}

export function translateExpenseCategory(category: string, lang: string) {
  const key = findCategoryKey(category);
  if (!key) return category;
  return lang === "pt-PT" ? labelsByLang[key].pt : labelsByLang[key].en;
}

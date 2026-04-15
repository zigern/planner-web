function categoryKey(name: string) {
  return name.trim().toLowerCase();
}

export function categoryIconKind(name: string) {
  const value = categoryKey(name);
  if (/(housing|habita|home|house|rent|mortgage|utilities|bills|contas)/i.test(value)) return "home";
  if (/(personal|pessoal)/i.test(value)) return "people";
  if (/(transport|car|fuel|uber|parking|trip)/i.test(value)) return "transport";
  if (/(food|dining|restaurant|comida)/i.test(value)) return "food";
  if (/(shopping|store|compras)/i.test(value)) return "bag";
  if (/(health|saude|doctor|pharmacy)/i.test(value)) return "plus";
  if (/(pets|animais|pet|dog|cat|vet)/i.test(value)) return "paw";
  if (/(entertainment|movie|fun|games)/i.test(value)) return "play";
  if (/(salary|income|business|investments|bonus|freelance|receita|renda)/i.test(value)) return "income";
  return "dot";
}

export function CategoryIcon({ kind }: { kind: string }) {
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
  if (kind === "people") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="8" cy="8" r="3" fill="currentColor" />
        <circle cx="16" cy="9" r="2.5" fill="currentColor" opacity="0.9" />
        <path d="M3.8 18c0-3 2.4-5.4 5.4-5.4S14.6 15 14.6 18v1.2H3.8z" fill="currentColor" />
        <path d="M13.4 19.2V18c0-2.2 1.8-4.1 4.1-4.1 2.2 0 4.1 1.8 4.1 4.1v1.2z" fill="currentColor" opacity="0.9" />
      </svg>
    );
  }
  if (kind === "transport") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 5h12a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3l1 2h-2l-1-2H9l-1 2H6l1-2a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2z" fill="currentColor" />
        <rect x="7" y="7" width="10" height="4" rx="1" fill="#ffffff" opacity="0.9" />
        <circle cx="9" cy="15" r="1.2" fill="#ffffff" />
        <circle cx="15" cy="15" r="1.2" fill="#ffffff" />
      </svg>
    );
  }
  if (kind === "food") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h1.7v5.6H9V3h1.7v5.6H12V3h1.7v6.4c0 1.3-1.1 2.4-2.4 2.4h-.5V21H9.2v-9.2h-.5c-1.3 0-2.4-1.1-2.4-2.4z" fill="currentColor" />
        <path d="M17.2 3c1.6 0 2.8 1.3 2.8 2.8V21h-1.8v-5.5h-2.7V10c0-4.1.8-7 1.7-7z" fill="currentColor" />
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
  if (kind === "play") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 6v12l10-6z" fill="currentColor" />
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

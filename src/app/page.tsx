import Link from "next/link";

function IconAnalytics() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20h16" />
      <rect x="6" y="10" width="3" height="8" rx="1" />
      <rect x="11" y="6" width="3" height="12" rx="1" />
      <rect x="16" y="12" width="3" height="6" rx="1" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l8 3v6c0 5.2-3.4 8.9-8 10-4.6-1.1-8-4.8-8-10V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l1.8 4.6L18 8.4l-4.2 1.8L12 15l-1.8-4.8L6 8.4l4.2-1.8L12 2z" />
      <path d="M5 17l.8 2 .7-2 2-.8-2-.7L5 13l-.7 2.5-2 .7 2 .8z" />
    </svg>
  );
}

const features = [
  {
    title: "Dashboard financeiro completo",
    description: "KPIs de income, expenses, savings e net worth com leitura instantanea.",
    icon: IconAnalytics
  },
  {
    title: "Seguranca e autenticacao",
    description: "Registo e login por utilizador com area privada para cada conta.",
    icon: IconShield
  },
  {
    title: "Orcamentos e objetivos",
    description: "Planeia limites por categoria e acompanha progresso de metas.",
    icon: IconTarget
  },
  {
    title: "Export profissional",
    description: "Gera ficheiros Excel para analise, reporting e partilha.",
    icon: IconSpark
  }
];

const highlights = [
  "Movimentos, budgets, bills, subscriptions, debts e assets num unico fluxo",
  "Graficos e resumos para leitura rapida",
  "Pronto para utilizadores finais e validacao de mercado",
  "Estrutura orientada a SaaS com onboarding simples"
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f0f7fb_0%,_#f8fbfd_40%,_#ffffff_100%)]">
      <section className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/site-logo.png" alt="Planqly Assets" className="h-11 w-auto object-contain" />
            <p className="hidden text-xs text-slate-600 md:block">Financial planning app</p>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white">
              Entrar
            </Link>
            <Link href="/login?mode=register" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Criar conta
            </Link>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="rounded-3xl border border-white/60 bg-white/85 p-8 shadow-sm backdrop-blur md:p-10">
            <p className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold tracking-wide text-brand-700">
              Plataforma para utilizadores da internet conhecerem a app antes do login
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
              Organiza o teu dinheiro com uma experiencia visual, simples e profissional.
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              Mostra claramente as funcionalidades da aplicacao, aumenta a confianca de novos utilizadores
              e converte visitas em registos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login?mode=register"
                className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-700"
              >
                Criar conta gratis
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                Ja tenho conta
              </Link>
            </div>
            <div className="mt-7 grid gap-2 text-sm text-slate-700">
              {highlights.map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <img src="/images/landing/real/live-capture-1.png" alt="Screenshot real do dashboard Planqly" className="h-full w-full object-cover" />
          </div>
        </div>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5">
              <div className="mb-3 inline-flex rounded-lg bg-slate-900 p-2 text-white">
                <feature.icon />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{feature.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Pre-visualizacao da experiencia</h2>
            <p className="hidden text-sm text-slate-500 md:block">Frontpage + app preparada para onboarding</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src="/images/landing/real/live-capture-1.png" alt="Screenshot real da pagina Spreadsheet na app" className="h-52 w-full object-cover" />
              <div className="p-5">
                <h3 className="font-semibold text-slate-900">Pagina Spreadsheet (app real)</h3>
                <p className="mt-2 text-sm text-slate-600">Demonstracao real da area onde o utilizador exporta e analisa dados.</p>
              </div>
            </article>
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src="/images/landing/real/live-capture-2.png" alt="Screenshot real do Excel premium exportado" className="h-52 w-full object-cover" />
              <div className="p-5">
                <h3 className="font-semibold text-slate-900">Excel premium exportado</h3>
                <p className="mt-2 text-sm text-slate-600">Preview real do ficheiro de relatorio gerado pela aplicacao.</p>
              </div>
            </article>
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src="/images/landing/real/live-capture-3.png" alt="Screenshot real da experiencia do dashboard" className="h-52 w-full object-cover" />
              <div className="p-5">
                <h3 className="font-semibold text-slate-900">Dashboard real da plataforma</h3>
                <p className="mt-2 text-sm text-slate-600">Visual verdadeiro da interface que o utilizador final encontra no produto.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-brand-100 bg-brand-50/70 p-8 text-center shadow-sm">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Comeca hoje com a tua frontpage de conversao</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Apresenta a aplicacao de forma profissional para qualquer pessoa na internet e transforma interesse em registos.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login?mode=register"
              className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
            >
              Criar conta
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Entrar
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

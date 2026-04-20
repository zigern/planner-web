import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#b9d6e3_0%,_#eef4f8_34%,_#f8fafc_62%,_#ffffff_100%)]">
      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600/90 shadow-sm" />
            <div>
              <p className="text-base font-bold tracking-wide text-slate-900">PLANQLY ASSETS</p>
              <p className="text-xs text-slate-600">Smart money planner</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
            <a href="#funcionalidades" className="hover:text-slate-900">Funcionalidades</a>
            <a href="#como-funciona" className="hover:text-slate-900">Como funciona</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
        </header>

        <div className="rounded-3xl border border-brand-100/70 bg-white/85 p-8 shadow-sm backdrop-blur md:p-12">
          <p className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold tracking-wide text-brand-700">
            Plataforma de gestão financeira pessoal
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Organiza receitas, despesas, objetivos e património num único dashboard.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Uma experiência simples para qualquer utilizador perceber para onde vai o dinheiro,
            tomar decisões melhores e acompanhar evolução mensal em segundos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login?mode=register"
              className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-700"
            >
              Criar conta grátis
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Já tenho conta
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Sem cartão de crédito. Acesso imediato ao dashboard após registo.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Visão geral instantânea", "Vê Income, Expenses, Savings e Net Worth no topo do dashboard."],
            ["Tudo centralizado", "Movimentos, bills, budgets, goals, debts e assets numa navegação simples."],
            ["Export profissional", "Exporta relatórios para Excel com organização clara para partilhar ou analisar."]
          ].map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">{description}</p>
            </article>
          ))}
        </div>

        <section id="funcionalidades" className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Funcionalidades que o utilizador vê logo no primeiro acesso
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["Dashboard completo", "KPIs principais, resumo anual e evolução mensal com leitura rápida."],
              ["Controlo de transações", "Adiciona, filtra e exporta movimentos para perceber padrões de gastos."],
              ["Gestão de compromissos", "Controla bills e subscriptions para reduzir falhas e surpresas."],
              ["Planeamento por orçamento", "Define limites por categoria e identifica excesso em tempo real."],
              ["Objetivos financeiros", "Acompanha metas com progresso e estado de conclusão."],
              ["Património e dívidas", "Vê a fotografia real da tua saúde financeira num só lugar."]
            ].map(([title, description]) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5"
              >
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Como funciona</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["1. Criar conta", "Regista-te em segundos e entra no teu painel pessoal."],
              ["2. Adicionar dados", "Lança receitas, despesas, budgets e objetivos de forma simples."],
              ["3. Acompanhar e melhorar", "Usa os gráficos e resumos para tomar melhores decisões todos os meses."]
            ].map(([title, description]) => (
              <div key={title} className="rounded-xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">O que já está incluído</h2>
          <div className="mt-5 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <p>Autenticação por conta (registo/login/logout)</p>
            <p>Base de dados MySQL pronta para Hostinger</p>
            <p>Dashboard com KPIs (Income, Expenses, Savings, Net Worth)</p>
            <p>Gráficos de tendência e despesas por categoria</p>
            <p>Lista de transações recentes com export</p>
            <p>Bills tracker e subscriptions tracker</p>
            <p>Financial goals tracker</p>
            <p>Debt tracker e gestão de assets</p>
            <p>Budget mensal por categoria com controlo de excesso</p>
          </div>
        </section>

        <section id="faq" className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">FAQ rápido</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-700">
            <div>
              <p className="font-semibold text-slate-900">É fácil de usar para quem não percebe de finanças?</p>
              <p className="mt-1">Sim. O layout foi desenhado para leitura simples, com indicadores claros e navegação direta.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Posso começar sem importar dados bancários?</p>
              <p className="mt-1">Sim. Podes inserir transações manualmente e mais tarde ligar contas bancárias, se quiseres.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Consigo exportar os resultados?</p>
              <p className="mt-1">Sim. A app permite exportar relatórios para análise externa e partilha.</p>
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-brand-100 bg-brand-50/70 p-8 text-center shadow-sm">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Pronto para começar?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Cria a tua conta e dá ao utilizador final uma experiência moderna para gerir dinheiro com confiança.
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

        <footer className="pb-4 pt-10 text-center text-xs text-slate-500">
          PLANQLY ASSETS · Planeamento financeiro pessoal · {new Date().getFullYear()}
        </footer>
      </section>
    </main>
  );
}

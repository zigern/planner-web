import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dcecef_0%,_#f8fafc_35%,_#ffffff_100%)]">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-brand-100 bg-white/90 p-8 shadow-sm backdrop-blur md:p-12">
          <p className="text-sm font-semibold tracking-wide text-brand-700">
            Planner Web · Finance SaaS Ready
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
            Planeador financeiro profissional, simples de usar e pronto para vender.
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Registo de receitas e despesas, resumo mensal, export CSV e autenticação de utilizadores.
            Tudo no teu alojamento Hostinger sem pagar serviços extra.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-brand-500 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
            >
              Começar agora
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100"
            >
              Ver dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Categorias prontas", "Income e expenses com categorias predefinidas e opção personalizada."],
            ["Filtro por mês", "Acompanha resultados mensais e compara performance recente."],
            ["Export CSV", "Exporta os teus dados financeiros para contabilidade ou análise externa."]
          ].map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">O que já está incluído</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <p>Autenticação por conta (registo/login/logout)</p>
            <p>Base de dados MySQL no teu Hostinger</p>
            <p>Dashboard com KPIs (Income, Expenses, Savings, Net Worth)</p>
            <p>Lista de transações recentes</p>
            <p>Resumo dos últimos meses</p>
            <p>Export de dados em CSV</p>
          </div>
        </div>
      </section>
    </main>
  );
}

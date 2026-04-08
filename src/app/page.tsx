import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-brand-700">Planner Web</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          O teu planner financeiro em app web
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          Stack: Next.js + Tailwind + MySQL + Auth própria. Funciona no teu
          alojamento Hostinger sem custo adicional de ferramentas.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-brand-500 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            Entrar
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100"
          >
            Ver dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

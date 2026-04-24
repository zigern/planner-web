"use client";

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const features = [
  {
    title: 'Real-time Overview',
    description: 'See your financial health at a glance with live metrics and quick insights.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4h7v7H4z" />
        <path d="M13 4h7v4h-7z" />
        <path d="M13 10h7v10h-7z" />
        <path d="M4 13h7v7H4z" />
      </svg>
    )
  },
  {
    title: 'Smart Insights',
    description: 'Understand spending patterns and discover where you can save more each month.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v18" />
        <path d="M6 9h12" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
  },
  {
    title: 'Goal Tracking',
    description: 'Set savings goals, track progress, and stay motivated to hit your targets.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19l6-6 4 4 6-10" />
        <path d="M20 10V4h-6" />
      </svg>
    )
  },
  {
    title: 'Budget Control',
    description: 'Create category budgets and stay ahead of overspending with clear signals.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 7h18v12H3z" />
        <path d="M3 11h18" />
        <path d="M8 15h3" />
      </svg>
    )
  },
  {
    title: 'Multi-Device',
    description: 'Access your dashboard from phone, tablet, or desktop, anytime and anywhere.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M10 18h4" />
      </svg>
    )
  }
]

const testimonials = [
  {
    quote: 'Planqly changed the way I manage money. It is simple, beautiful and super helpful.',
    name: 'Rui Almeida',
    role: 'Entrepreneur'
  },
  {
    quote: 'The insights are amazing. I finally understand where my money goes each month.',
    name: 'Ines Martins',
    role: 'Marketing Manager'
  },
  {
    quote: 'Clean design, easy to use, and everything in one place. Highly recommended.',
    name: 'Pedro Silva',
    role: 'Software Engineer'
  }
]

const plans = [
  {
    name: 'Starter',
    price: '$4.99',
    subtitle: 'Perfect for getting started.',
    perks: ['Track income and expenses', 'Basic insights', 'Up to 2 accounts'],
    featured: false
  },
  {
    name: 'Pro',
    price: '$8.99',
    subtitle: 'Everything you need to grow.',
    perks: ['Everything in Starter', 'Advanced insights', 'Unlimited accounts', 'Goal tracking', 'Export data'],
    featured: true
  },
  {
    name: 'Premium',
    price: '$14.99',
    subtitle: 'For users who want it all.',
    perks: ['Everything in Pro', 'Custom budgets', 'Priority support', 'Early access to features'],
    featured: false
  }
]

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '#about', label: 'About' }
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!mobileMenuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileMenuOpen])

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f9ff] via-white to-[#f9fbff] text-slate-900">
      {mobileMenuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[82vw] max-w-[330px] border-r border-slate-200 bg-white p-5 shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <Image src="/images/site-logo.png" alt="Planqly Assets" width={170} height={42} className="h-auto w-[140px]" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600"
          >
            Close
          </button>
        </div>
        <nav className="grid gap-2">
          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/download"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700"
          >
            Download
          </Link>
          <Link
            href="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Get the Dashboard
          </Link>
        </nav>
      </aside>

      <div className="mx-auto max-w-[1200px] px-4 pb-14 pt-5 sm:px-6 md:px-8 md:pb-16 md:pt-6 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-3">
              <Image src="/images/site-logo.png" alt="Planqly Assets" width={170} height={42} className="h-auto w-[136px] sm:w-[150px]" priority />
            </Link>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
            {navLinks.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-blue-600">{item.label}</a>
            ))}
            <Link href="/download" className="transition hover:text-blue-600">Download</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="hidden text-sm font-semibold text-slate-600 hover:text-blue-600 sm:inline-flex">
              Log in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:from-blue-700 hover:to-blue-600"
            >
              <span className="sm:hidden">Get App</span>
              <span className="hidden sm:inline">Get the Dashboard</span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </header>

        <section className="grid gap-9 pb-14 pt-8 sm:pt-10 md:pb-16 md:pt-12 lg:grid-cols-[1.03fr_1fr] lg:items-center lg:pt-14">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700 sm:mb-5 sm:px-4 sm:py-2 sm:text-xs">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">↗</span>
              Financial Planner Dashboard
            </div>
            <h1 className="max-w-xl text-[2.25rem] font-black leading-[1.05] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              Take control of your <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">financial future.</span>
            </h1>
            <div className="relative mt-5 lg:hidden">
              <div className="relative mx-auto flex max-w-[520px] justify-center">
                <Image
                  src="/images/landing/real/home-hero-replacement-v4.png"
                  alt="Planqly dashboard preview"
                  width={1366}
                  height={1151}
                  className="h-auto w-full object-contain"
                  priority
                />
              </div>
            </div>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:mt-6 sm:text-lg">
              All your finances in one intelligent dashboard. Plan, track and achieve your goals with total clarity.
            </p>

            <ul className="mt-6 space-y-2.5 text-[15px] text-slate-700 sm:mt-7 sm:space-y-3 sm:text-base">
              {[
                'Track income, expenses and savings in real-time',
                'Set goals and build better financial habits',
                'Visual insights that support smarter decisions',
                'Secure, private and easy to use'
              ].map((point) => (
                <li key={point} className="flex items-center gap-3">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300 text-blue-600">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-200 sm:min-w-[190px] sm:w-auto"
              >
                Get the Dashboard
                <span aria-hidden>→</span>
              </Link>
              <a
                href="#features"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-blue-300 bg-white px-6 py-3.5 text-base font-semibold text-blue-600 sm:min-w-[190px] sm:w-auto"
              >
                Live Demo
              </a>
            </div>

            <div className="mt-7 flex flex-col items-start gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map((avatar) => (
                  <div
                    key={avatar}
                    className="h-9 w-9 rounded-full border-2 border-white bg-gradient-to-br from-slate-300 to-slate-500"
                  />
                ))}
              </div>
              <p>Trusted by 2,000+ users to manage finances better</p>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-blue-200/50 blur-3xl" />
            <div className="absolute -bottom-12 -right-8 h-44 w-44 rounded-full bg-cyan-200/50 blur-3xl" />
            <div className="relative mx-auto flex max-w-[560px] justify-center lg:max-w-[680px]">
              <Image
                src="/images/landing/real/home-hero-replacement-v4.png"
                alt="Planqly dashboard preview"
                width={1366}
                height={1151}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
          </div>
        </section>
      </div>

      <section className="border-y border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 py-6">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 sm:px-6 md:px-8 lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">Mobile App</p>
            <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">Download for Android and iPhone directly from this website</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              Android
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              iOS
            </span>
            <Link
              href="/download"
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              View install steps
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16 md:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Powerful Features</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            Everything you need to <span className="text-blue-600">manage your money</span>
          </h2>
        </div>
        <div className="mobile-slider-hint hide-scrollbar mt-10 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:gap-4 md:overflow-visible md:px-0 md:pb-0 md:grid-cols-2 lg:grid-cols-5">
          {features.map((feature) => (
            <article key={feature.title} className="mobile-slide-card min-w-[85%] snap-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:min-w-0">
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {feature.icon}
              </span>
              <h3 className="text-base font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto grid max-w-[1200px] gap-8 px-4 pb-14 sm:px-6 sm:pb-16 md:px-8 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:px-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <Image
            src="/images/landing/real/live-capture-1.png"
            alt="Planqly app on real usage"
            width={900}
            height={580}
            className="h-auto w-full rounded-2xl border border-slate-100"
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Why Planqly?</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            A better way to manage your <span className="text-blue-600">finances</span>
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
            Planqly helps you see the big picture, make better decisions, and build a healthier financial life.
          </p>
          <ul className="mt-6 space-y-3 text-slate-700">
            {[
              'All-in-one dashboard for complete financial control',
              'Beautiful, intuitive and easy to use',
              'Your data is 100% private and secure',
              'Save time and focus on what matters most'
            ].map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300 text-xs text-blue-600">
                  ✓
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200"
          >
            Get Started Today
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <section id="testimonials" className="mx-auto max-w-[1200px] px-4 pb-14 sm:px-6 sm:pb-16 md:px-8 lg:px-10">
        <div className="mb-8 max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">What users say</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-slate-900">Loved by people who take control</h2>
        </div>
        <div className="mobile-slider-hint hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:gap-5 md:overflow-visible md:px-0 md:pb-0 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="mobile-slide-card min-w-[85%] snap-start rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:min-w-0">
              <p className="mb-4 text-yellow-500">★★★★★</p>
              <p className="text-slate-700">“{item.quote}”</p>
              <p className="mt-6 font-semibold text-slate-900">{item.name}</p>
              <p className="text-sm text-slate-500">{item.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1200px] px-4 pb-14 sm:px-6 sm:pb-16 md:px-8 lg:px-10">
        <div className="mb-8 max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Simple Pricing</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-slate-900">Choose the plan that&apos;s right for you</h2>
        </div>
        <div className="mobile-slider-hint hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:gap-5 md:overflow-visible md:px-0 md:pb-0 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`mobile-slide-card min-w-[85%] snap-start rounded-2xl border bg-white p-6 shadow-sm md:min-w-0 ${
                plan.featured ? 'border-blue-500 shadow-[0_20px_40px_-20px_rgba(37,99,235,0.45)]' : 'border-slate-200'
              }`}
            >
              {plan.featured ? (
                <span className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Most Popular
                </span>
              ) : null}
              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{plan.subtitle}</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                <span className="mb-1 text-sm text-slate-500">/month</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`mt-7 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  plan.featured
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-blue-300 text-blue-700 hover:bg-blue-50'
                }`}
              >
                Start Free Trial
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-700 to-blue-500 py-10 text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-2xl font-black leading-tight">Ready to take control of your financial future?</p>
            <p className="mt-2 text-blue-100">Join thousands of users already managing money smarter.</p>
          </div>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 sm:w-auto"
          >
            Get the Dashboard
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 md:px-8 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:px-10">
          <div>
            <Image src="/images/site-logo.png" alt="Planqly Assets" width={170} height={42} className="h-auto w-[150px]" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600">
              The all-in-one financial planner dashboard to help you plan, track and achieve your goals.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Features</li>
              <li>Pricing</li>
              <li>Security</li>
              <li>Updates</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>About</li>
              <li>Blog</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Stay Updated</h4>
            <p className="mt-3 text-sm text-slate-600">Get tips and updates to manage your money better.</p>
            <div className="mt-4 grid gap-2 sm:flex">
              <input
                type="email"
                placeholder="Your email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-200 placeholder:text-slate-400 focus:ring"
              />
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Subscribe</button>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 py-5 text-center text-xs text-slate-500">© 2026 Planqly Assets. All rights reserved.</div>
      </footer>
    </main>
  )
}

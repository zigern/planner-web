import Link from "next/link";
import { DownloadInstallActions } from "@/components/download-install-actions";

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M7.28 4.2 5.77 1.57l.86-.5 1.54 2.67a8.39 8.39 0 0 1 7.66 0l1.54-2.67.86.5-1.5 2.63a8.06 8.06 0 0 1 3.56 6.68H3.72A8.06 8.06 0 0 1 7.28 4.2Zm1.85 3.5a.76.76 0 1 0 0 1.53.76.76 0 0 0 0-1.53Zm5.74 0a.76.76 0 1 0 0 1.53.76.76 0 0 0 0-1.53Z" />
      <path d="M3.07 11.95v6.67a1.13 1.13 0 0 0 2.26 0v-6.67Zm17.86 0v6.67a1.13 1.13 0 0 1-2.26 0v-6.67ZM6.2 11.95v8.7a1.13 1.13 0 0 0 1.13 1.13h1.2V19.2a1.13 1.13 0 1 1 2.27 0v2.58h2.4V19.2a1.13 1.13 0 0 1 2.27 0v2.58h1.2a1.13 1.13 0 0 0 1.13-1.13v-8.7Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M16.37 12.78c.02 2.27 1.98 3.03 2 3.04-.02.05-.3 1.03-.99 2.03-.6.86-1.22 1.71-2.2 1.73-.96.02-1.27-.57-2.38-.57-1.1 0-1.44.55-2.36.59-.94.03-1.66-.95-2.26-1.8-1.23-1.79-2.17-5.04-.9-7.24.63-1.1 1.77-1.8 3-1.82.93-.02 1.8.63 2.38.63.58 0 1.67-.78 2.82-.67.48.02 1.83.2 2.7 1.46-.07.04-1.61.95-1.59 2.62Zm-1.89-5.41c.5-.6.84-1.44.75-2.27-.72.03-1.58.48-2.1 1.08-.46.53-.86 1.38-.75 2.2.8.06 1.6-.41 2.1-1.01Z" />
    </svg>
  );
}

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f9ff] via-white to-[#f9fbff] text-slate-900">
      <div className="mx-auto max-w-[980px] px-4 py-8 sm:px-6 sm:py-10 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Install Planqly on your phone</h1>
          <Link href="/" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
            Back to website
          </Link>
        </div>
        <p className="mt-4 max-w-3xl text-base text-slate-600 sm:text-lg">
          You can install directly from this website and use Planqly like a native mobile app.
        </p>

        <DownloadInstallActions />

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <AndroidIcon />
              Android
            </div>
            <ol className="space-y-3 text-slate-700">
              <li>1. Open this website in Chrome.</li>
              <li>2. Tap the button Install on Android (or browser menu).</li>
              <li>3. Confirm Install.</li>
              <li>4. The app will appear on your home screen.</li>
            </ol>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">
              <AppleIcon />
              iPhone (iOS)
            </div>
            <ol className="space-y-3 text-slate-700">
              <li>1. Open this website in Safari.</li>
              <li>2. Tap Share.</li>
              <li>3. Select Add to Home Screen.</li>
              <li>4. Tap Add to install.</li>
            </ol>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm text-blue-900">
            Tip: if your browser still shows an old version, close all tabs for this site and open it again:
            {" "}
            <a href="https://mediumpurple-starling-116558.hostingersite.com/" className="font-semibold underline">
              mediumpurple-starling-116558.hostingersite.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}

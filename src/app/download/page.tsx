import Link from "next/link";
import { DownloadInstallActions } from "@/components/download-install-actions";

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
        <p className="mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
          Choose your device and start the installation instantly.
        </p>

        <DownloadInstallActions />
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({
  className,
  label
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      className={
        className ||
        "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
      }
    >
      <svg className="side-action-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M8 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8v-2h7V5H8V3Zm1.7 10.7L12.4 11H3V9h9.4L9.7 6.3l1.4-1.4 5.1 5.1-5.1 5.1-1.4-1.4Z"
          fill="currentColor"
        />
      </svg>
      <span>{loading ? "A sair..." : label || "Terminar sessão"}</span>
    </button>
  );
}

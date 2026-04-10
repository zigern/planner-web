"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ActivityDeleteButton({
  id,
  label = "Anular",
  confirmText = "Queres anular este registo?"
}: {
  id: number;
  label?: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (loading) return;
    const shouldDelete = window.confirm(confirmText);
    if (!shouldDelete) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        alert("Não foi possível anular o registo.");
        return;
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" className="activity-delete-btn" onClick={handleDelete} disabled={loading}>
      {loading ? "A anular..." : label}
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SubscriptionAddForm() {
  const router = useRouter();
  const [service, setService] = useState("");
  const [cost, setCost] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        service: service.trim(),
        cost: Number(cost),
        billingCycle: "monthly",
        category: "Software",
        status: "active"
      };

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        setMessage("Could not save subscription.");
        return;
      }

      setService("");
      setCost("");
      setMessage("Subscription added.");
      router.refresh();
    } catch {
      setMessage("Could not save subscription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="sub-form" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="Netflix"
        value={service}
        onChange={(e) => setService(e.target.value)}
        required
      />
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="10.99"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Add"}
      </button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}


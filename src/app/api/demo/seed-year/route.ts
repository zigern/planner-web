import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

const bodySchema = z.object({
  year: z.number().int().min(2020).max(2100).optional(),
  replace: z.boolean().optional()
});

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function clamp2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const payload = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!payload.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const year = payload.data.year ?? new Date().getFullYear();
  const replace = payload.data.replace ?? true;
  const db = getDb();
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    if (replace) {
      await conn.query("DELETE FROM transactions WHERE user_id = ?", [user.userId]);
      await conn.query("DELETE FROM monthly_budgets WHERE user_id = ?", [user.userId]);
      await conn.query("DELETE FROM subscriptions WHERE user_id = ?", [user.userId]);
      await conn.query("DELETE FROM bills WHERE user_id = ?", [user.userId]);
      await conn.query("DELETE FROM assets WHERE user_id = ?", [user.userId]);
      await conn.query("DELETE FROM debts WHERE user_id = ?", [user.userId]);
      await conn.query("DELETE FROM goals WHERE user_id = ?", [user.userId]);
      await conn.query("DELETE FROM recurring_rules WHERE user_id = ?", [user.userId]).catch(() => undefined);
    }

    const monthFactor = [0.94, 1.02, 0.98, 1.06, 1.01, 1.1, 0.97, 1.04, 0.99, 1.07, 0.96, 1.13];
    const freelanceWave = [340, 260, 480, 300, 420, 560, 310, 450, 390, 520, 360, 700];
    const quarterBonus = [0, 0, 350, 0, 0, 420, 0, 0, 500, 0, 0, 700];

    const toTransactions: Array<[number, "income" | "expense", number, string, string | null, string]> = [];

    for (let month = 1; month <= 12; month += 1) {
      const f = monthFactor[month - 1];

      const salary = 2600;
      const freelance = freelanceWave[month - 1];
      const bonus = quarterBonus[month - 1];

      toTransactions.push([user.userId, "income", salary, "Salary", "Salary", isoDate(year, month, 1)]);
      toTransactions.push([user.userId, "income", freelance, "Business", "Freelance clients", isoDate(year, month, 12)]);
      if (bonus > 0) {
        toTransactions.push([user.userId, "income", bonus, "Bonus", "Quarterly bonus", isoDate(year, month, 25)]);
      }

      const rent = clamp2(650);
      const utilities = clamp2(95 * f);
      const internet = 35;
      const groceries = clamp2(280 * f);
      const dining = clamp2(95 * f);
      const transport = clamp2(140 * f);
      const personal = clamp2(175 * f);
      const health = clamp2((month % 3 === 0 ? 120 : 45) * f);
      const shopping = clamp2((month % 2 === 0 ? 140 : 80) * f);
      const pets = clamp2((month % 2 === 1 ? 55 : 35) * f);
      const other = clamp2((month % 4 === 0 ? 90 : 40) * f);

      toTransactions.push([user.userId, "expense", rent, "Housing", "Rent", isoDate(year, month, 2)]);
      toTransactions.push([user.userId, "expense", utilities, "Bills", "Utilities", isoDate(year, month, 5)]);
      toTransactions.push([user.userId, "expense", internet, "Bills", "Internet", isoDate(year, month, 7)]);
      toTransactions.push([user.userId, "expense", groceries, "Food", "Groceries", isoDate(year, month, 10)]);
      toTransactions.push([user.userId, "expense", dining, "Food", "Dining out", isoDate(year, month, 17)]);
      toTransactions.push([user.userId, "expense", transport, "Transportation", "Fuel and commute", isoDate(year, month, 14)]);
      toTransactions.push([user.userId, "expense", personal, "Personal", "Personal care", isoDate(year, month, 18)]);
      toTransactions.push([user.userId, "expense", health, "Health", "Pharmacy & medical", isoDate(year, month, 21)]);
      toTransactions.push([user.userId, "expense", shopping, "Shopping", "Online shopping", isoDate(year, month, 24)]);
      toTransactions.push([user.userId, "expense", pets, "Pets", "Pet expenses", isoDate(year, month, 26)]);
      toTransactions.push([user.userId, "expense", other, "Other", "Misc expenses", isoDate(year, month, 28)]);
    }

    for (const tx of toTransactions) {
      await conn.query(
        `INSERT INTO transactions (user_id, type, amount, category, description, transaction_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        tx
      );
    }

    const budgetPerCategory: Array<[string, number]> = [
      ["Housing", 700],
      ["Food", 450],
      ["Transportation", 220],
      ["Bills", 260],
      ["Personal", 260],
      ["Health", 160],
      ["Shopping", 200],
      ["Pets", 120],
      ["Other", 150]
    ];

    for (let month = 1; month <= 12; month += 1) {
      const budgetMonth = `${year}-${pad2(month)}`;
      for (const [category, amount] of budgetPerCategory) {
        await conn.query(
          `INSERT INTO monthly_budgets (user_id, budget_month, category, budget_amount)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE budget_amount = VALUES(budget_amount)`,
          [user.userId, budgetMonth, category, amount]
        );
      }
    }

    const subscriptions: Array<[number, string, number, "monthly" | "yearly", string, "active" | "paused" | "cancelled", string]> = [
      [user.userId, "Netflix", 11.99, "monthly", "Entertainment", "active", isoDate(year, 1, 8)],
      [user.userId, "Spotify", 7.99, "monthly", "Entertainment", "active", isoDate(year, 1, 12)],
      [user.userId, "Google Drive", 2.99, "monthly", "Software", "active", isoDate(year, 1, 20)],
      [user.userId, "ChatGPT", 20, "monthly", "Software", "active", isoDate(year, 1, 3)],
      [user.userId, "Gym", 29.9, "monthly", "Health", "active", isoDate(year, 1, 10)]
    ];
    for (const sub of subscriptions) {
      await conn.query(
        `INSERT INTO subscriptions (user_id, service, cost, billing_cycle, category, status, renewal_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        sub
      );
    }

    const bills: Array<[number, string, number, number, "monthly" | "quarterly" | "yearly", "pending" | "paid", number, string]> = [
      [user.userId, "Rent", 650, 1, "monthly", "pending", 0, isoDate(year, 1, 1)],
      [user.userId, "Electricity", 55, 5, "monthly", "pending", 1, isoDate(year, 1, 5)],
      [user.userId, "Water", 25, 6, "monthly", "pending", 1, isoDate(year, 1, 6)],
      [user.userId, "Internet", 35, 7, "monthly", "pending", 1, isoDate(year, 1, 7)],
      [user.userId, "Insurance", 280, 15, "quarterly", "pending", 0, isoDate(year, 1, 15)]
    ];
    for (const bill of bills) {
      await conn.query(
        `INSERT INTO bills (user_id, name, amount, due_day, frequency, status, auto_pay, next_due)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        bill
      );
    }

    const assets: Array<[number, string, string, number, string]> = [
      [user.userId, "Emergency Savings", "Savings", 5200, isoDate(year, 12, 31)],
      [user.userId, "ETF Portfolio", "Investments", 8200, isoDate(year, 12, 31)],
      [user.userId, "Main Car", "Vehicle", 7000, isoDate(year, 12, 31)],
      [user.userId, "Cash Reserve", "Cash", 2100, isoDate(year, 12, 31)]
    ];
    for (const asset of assets) {
      await conn.query(
        `INSERT INTO assets (user_id, name, asset_type, value, as_of_date)
         VALUES (?, ?, ?, ?, ?)`,
        asset
      );
    }

    const debts: Array<[number, string, number, number, number, string]> = [
      [user.userId, "Credit Card", 2400, 1100, 18.9, isoDate(year + 1, 3, 20)],
      [user.userId, "Car Loan", 9800, 3600, 6.1, isoDate(year + 3, 9, 1)]
    ];
    for (const debt of debts) {
      await conn.query(
        `INSERT INTO debts (user_id, name, total_owed, amount_paid, interest_rate, due_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        debt
      );
    }

    const goals: Array<[number, string, number, number, string, "not_started" | "in_progress" | "completed"]> = [
      [user.userId, "Emergency Fund", 10000, 5200, isoDate(year + 1, 12, 31), "in_progress"],
      [user.userId, "Vacation", 3000, 1200, isoDate(year + 1, 6, 30), "in_progress"],
      [user.userId, "New Laptop", 2200, 900, isoDate(year + 1, 4, 30), "in_progress"]
    ];
    for (const goal of goals) {
      await conn.query(
        `INSERT INTO goals (user_id, name, target_amount, saved_amount, deadline, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        goal
      );
    }

    await conn.commit();

    return NextResponse.json({
      ok: true,
      year,
      inserted: {
        transactions: toTransactions.length,
        budgets: 12 * budgetPerCategory.length,
        subscriptions: subscriptions.length,
        bills: bills.length,
        assets: assets.length,
        debts: debts.length,
        goals: goals.length
      }
    });
  } catch (error) {
    await conn.rollback();
    return NextResponse.json({ error: "Falha ao gerar dados demo." }, { status: 500 });
  } finally {
    conn.release();
  }
}

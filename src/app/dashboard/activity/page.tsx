import { redirect } from "next/navigation";

export default async function ActivityPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) || {};
  const qs = new URLSearchParams();

  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined) continue;
    if (Array.isArray(raw)) {
      for (const value of raw) qs.append(key, value);
    } else {
      qs.set(key, raw);
    }
  }

  const suffix = qs.toString();
  redirect(suffix ? `/dashboard/spreadsheet?${suffix}` : "/dashboard/spreadsheet");
}

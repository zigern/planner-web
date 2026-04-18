import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasGoCardlessConfig, listInstitutions } from "@/lib/banking/gocardless";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!hasGoCardlessConfig()) {
    return NextResponse.json(
      { error: "Falta configurar ligação bancária (GOCARDLESS_SECRET_ID/KEY)." },
      { status: 400 }
    );
  }

  try {
    const url = new URL(request.url);
    const country = (url.searchParams.get("country") || "PT").toUpperCase();
    const institutions = await listInstitutions(country);
    return NextResponse.json({
      items: institutions
        .map((item) => ({
          id: item.id,
          name: item.name,
          countries: item.countries || [],
          logo: item.logo || null
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    });
  } catch (error) {
    console.error("bank.institutions.error", error);
    return NextResponse.json({ error: "Falha ao listar bancos." }, { status: 500 });
  }
}

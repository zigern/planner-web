type TokenResponse = {
  access: string;
  access_expires: number;
};

type Institution = {
  id: string;
  name: string;
  bic?: string;
  transaction_total_days?: string;
  countries?: string[];
  logo?: string;
};

type RequisitionResponse = {
  id: string;
  link: string;
  status: string;
  institution_id: string;
  reference: string;
  accounts?: string[];
  user_language?: string;
  agreement?: string | null;
};

type AccountDetailsResponse = {
  account: {
    resourceId?: string;
    iban?: string;
    ownerName?: string;
    name?: string;
    currency?: string;
    product?: string;
  };
};

type AccountBalancesResponse = {
  balances?: Array<{
    balanceAmount?: { amount?: string; currency?: string };
    referenceDate?: string;
    balanceType?: string;
  }>;
};

type AccountTransactionsResponse = {
  transactions?: {
    booked?: Array<Record<string, unknown>>;
    pending?: Array<Record<string, unknown>>;
  };
};

function getBaseUrl() {
  return process.env.GOCARDLESS_BASE_URL || "https://bankaccountdata.gocardless.com/api/v2";
}

function getCredentials() {
  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;
  if (!secretId || !secretKey) {
    return null;
  }
  return { secretId, secretKey };
}

export function hasGoCardlessConfig() {
  return Boolean(getCredentials());
}

async function getAccessToken() {
  const credentials = getCredentials();
  if (!credentials) {
    throw new Error("Missing GOCARDLESS_SECRET_ID/GOCARDLESS_SECRET_KEY.");
  }

  const response = await fetch(`${getBaseUrl()}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret_id: credentials.secretId,
      secret_key: credentials.secretKey
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GoCardless token error: ${response.status} ${body}`);
  }

  return (await response.json()) as TokenResponse;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.access}`,
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GoCardless API error: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
}

export async function listInstitutions(countryCode: string) {
  const country = countryCode.trim().toUpperCase();
  return api<Institution[]>(`/institutions/?country=${encodeURIComponent(country)}`);
}

export async function createRequisition(params: {
  institutionId: string;
  redirect: string;
  reference: string;
  userLanguage?: string;
}) {
  return api<RequisitionResponse>("/requisitions/", {
    method: "POST",
    body: JSON.stringify({
      institution_id: params.institutionId,
      redirect: params.redirect,
      reference: params.reference,
      user_language: params.userLanguage || "PT"
    })
  });
}

export async function getRequisition(requisitionId: string) {
  return api<RequisitionResponse>(`/requisitions/${encodeURIComponent(requisitionId)}/`);
}

export async function getAccountDetails(accountId: string) {
  return api<AccountDetailsResponse>(`/accounts/${encodeURIComponent(accountId)}/details/`);
}

export async function getAccountBalances(accountId: string) {
  return api<AccountBalancesResponse>(`/accounts/${encodeURIComponent(accountId)}/balances/`);
}

export async function getAccountTransactions(accountId: string, dateFrom: string, dateTo: string) {
  return api<AccountTransactionsResponse>(
    `/accounts/${encodeURIComponent(accountId)}/transactions/?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`
  );
}

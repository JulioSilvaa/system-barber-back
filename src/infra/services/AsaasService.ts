export class AsaasApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AsaasApiError';
  }
}

type AsaasCustomer = { id: string };

type AsaasSubscription = {
  id: string;
  value?: number;
  nextDueDate?: string;
};

type AsaasErrorResponse = {
  errors?: Array<{ code?: string; description?: string }>;
};

export type CreateCustomerInput = {
  name: string;
  email: string;
  cpfCnpj: string;
};

export type CreateSubscriptionInput = {
  customer: string;
  billingType: 'UNDEFINED';
  value: number;
  cycle: 'MONTHLY';
  nextDueDate: string;
  description?: string;
};

export type UpdateSubscriptionInput = {
  value?: number;
  nextDueDate?: string;
};

const DEFAULT_TIMEOUT_MS = 15000;

export default class AsaasService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(
    baseUrl: string = process.env.ASAAS_API_URL ?? '',
    apiKey: string = process.env.ASAAS_API_KEY ?? '',
    fetchImpl: typeof fetch = fetch,
  ) {
    if (!baseUrl || !apiKey) {
      throw new Error('Asaas não configurado: defina ASAAS_API_URL e ASAAS_API_KEY');
    }
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl.bind(globalThis);
  }

  async createCustomer(input: CreateCustomerInput): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateSubscription(id: string, input: UpdateSubscriptionInput): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async deleteSubscription(id: string): Promise<boolean> {
    await this.request<unknown>(`/subscriptions/${id}`, { method: 'DELETE' });
    return true;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'access-token': this.apiKey,
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const description = extractErrorDescription(body);
      throw new AsaasApiError(
        `Erro na API do Asaas (${response.status}): ${description}`,
        response.status,
      );
    }

    return body as T;
  }
}

function extractErrorDescription(body: unknown): string {
  const maybe = body as AsaasErrorResponse | null;
  const first = maybe?.errors?.[0]?.description;
  return first ?? 'resposta inválida da API';
}

export function createAsaasService(): AsaasService | null {
  const baseUrl = process.env.ASAAS_API_URL ?? '';
  const apiKey = process.env.ASAAS_API_KEY ?? '';
  if (!baseUrl || !apiKey) return null;
  return new AsaasService(baseUrl, apiKey);
}

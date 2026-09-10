export interface Payment {
  id: string;
  status: 'CREATING' | 'PENDING' | 'UNKNOWN' | 'FAILED' | 'REJECTED' | 'CANCELED';
  amountCents: number;
  pixCode: string | null;
}
export interface PassageSummary {
  passages: { id: string; amountCents: number; status: string }[];
  amountCents: number;
  payment: Payment | null;
}
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('Backend indisponível. Inicie o servidor de pagamentos.'); }
  if (!response.ok) throw new Error(data.error || 'Não foi possível consultar o pagamento.');
  return data as T;
}
export const getPassages = (plate: string) => request<PassageSummary>(`/api/demo/passages?${new URLSearchParams({ plate })}`);
export const createPayment = (passageIds: string[]) => request<Payment>('/api/demo/payments', { passageIds });
export const getPayment = (id: string) => request<Payment>(`/api/demo/payments/${encodeURIComponent(id)}`);

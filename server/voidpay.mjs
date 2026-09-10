export class PaymentError extends Error {
  constructor(message, status = 503, code = 'UNAVAILABLE') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// The supplied documentation defines production only. No sandbox URL is assumed.
// Fictional demonstration passages must never be sent to the production endpoint.
export function createVoidpay(env = process.env, fetchImpl = fetch) {
  function configuration() {
    if (env.VOIDPAY_ENV !== 'sandbox' || !env.VOIDPAY_SANDBOX_BASE_URL) {
      throw new PaymentError('O sandbox da Voidpay ainda não foi configurado. Nenhuma cobrança foi enviada.');
    }
    let base;
    try { base = new URL(env.VOIDPAY_SANDBOX_BASE_URL); } catch {
      throw new PaymentError('A URL do sandbox da Voidpay é inválida.');
    }
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash ||
      ['dash.voidpayments.com', 'dash.voidpay.com.br'].includes(base.hostname)) {
      throw new PaymentError('Use exclusivamente a URL de sandbox confirmada pela Voidpay; o endpoint de produção não é permitido nesta demonstração.');
    }
    const client = {
      name: env.VOIDPAY_TEST_CLIENT_NAME,
      email: env.VOIDPAY_TEST_CLIENT_EMAIL,
      phone: env.VOIDPAY_TEST_CLIENT_PHONE,
      document: env.VOIDPAY_TEST_CLIENT_DOCUMENT,
    };
    if (!env.VOIDPAY_PUBLIC_KEY || !env.VOIDPAY_SECRET_KEY || Object.values(client).some(v => !v?.trim())) {
      throw new PaymentError('Configure as chaves e os dados de cliente de teste da Voidpay no servidor.');
    }
    return { url: `${base.href.replace(/\/$/, '')}/gateway/pix/receive`, client };
  }
  return {
    assertReady: configuration,
    async create({ id, passages, amountCents }) {
      const { url, client } = configuration();
      let response;
      try {
        response = await fetchImpl(url, {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
          headers: {
            'Content-Type': 'application/json',
            'x-public-key': env.VOIDPAY_PUBLIC_KEY,
            'x-secret-key': env.VOIDPAY_SECRET_KEY,
          },
          body: JSON.stringify({
            identifier: id, amount: amountCents / 100, client,
            products: passages.map((p, i) => ({
              id: p.id, name: ` ${i + 1} — `,
              quantity: 1, price: p.amount_cents / 100, physical: false,
            })),
            metadata: { provider: 'Nova381-demo', orderId: id },
          }),
        });
      } catch {
        throw new PaymentError('A resposta da Voidpay não chegou. A tentativa foi preservada para evitar outra cobrança.', 502, 'UNKNOWN');
      }
      // Without documented provider idempotency/reconciliation, even non-2xx
      // responses cannot safely authorize another charge for these passages.
      if (!response.ok) throw new PaymentError('A Voidpay não confirmou a criação do Pix. A tentativa foi preservada para conferência.', 502, 'UNKNOWN');
      let data;
      try { data = await response.json(); } catch {
        throw new PaymentError('Resposta inválida da Voidpay. A tentativa foi preservada.', 502, 'UNKNOWN');
      }
      if (!data || typeof data.transactionId !== 'string' || !data.transactionId) {
        throw new PaymentError('A Voidpay não retornou um identificador válido. A tentativa foi preservada.', 502, 'UNKNOWN');
      }
      if (['FAILED', 'REJECTED', 'CANCELED'].includes(data.status)) {
        return { transactionId: data.transactionId, status: data.status, pixCode: null };
      }
      if (!['OK', 'PENDING'].includes(data.status) || typeof data.pix?.code !== 'string' ||
        !data.pix.code.trim() || data.pix.code.length > 4096) {
        throw new PaymentError('A Voidpay não retornou um código Pix válido. A tentativa foi preservada.', 502, 'UNKNOWN');
      }
      // OK means successful creation, never payment approval. No PAID mutation
      // is available until the authenticated webhook contract is supplied.
      return { transactionId: data.transactionId, status: 'PENDING', pixCode: data.pix.code };
    },
  };
}

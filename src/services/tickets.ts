import { config } from "../config";

export interface Ticket {
  ticketAlpuid: number;
  plate: string;
  ticketDateTime: number;
  value: number;
  tollName: string;
  siteName: string;
  instanceCode: string;
}

type Recaptcha = {
  ready(callback: () => void): void;
  execute(key: string, options: { action: string }): Promise<string>;
};
declare global {
  interface Window {
    grecaptcha?: Recaptcha;
  }
}

let captchaReady: Promise<void> | undefined;
function loadCaptcha(): Promise<void> {
  if (!config.recaptchaSiteKey) {
    return Promise.reject(
      new Error(
        "A consulta local precisa de uma chave reCAPTCHA configurada para este domínio.",
      ),
    );
  }
  if (window.grecaptcha) return Promise.resolve();
  return (captchaReady ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(
      () =>
        reject(
          new Error(
            "A verificação de segurança demorou para responder. Tente novamente.",
          ),
        ),
      15000,
    );
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(config.recaptchaSiteKey)}`;
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeout);
      script.remove();
      reject(
        new Error("Não foi possível carregar a verificação de segurança."),
      );
    };
    document.head.append(script);
  }).catch((error) => {
    captchaReady = undefined;
    throw error;
  }));
}

async function captchaToken(): Promise<string> {
  await loadCaptcha();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error("Não foi possível concluir a verificação de segurança."),
        ),
      15000,
    );
    window.grecaptcha!.ready(() => {
      window
        .grecaptcha!.execute(config.recaptchaSiteKey, {
          action: "ticketSearch",
        })
        .then(resolve, reject)
        .finally(() => clearTimeout(timer));
    });
  });
}

function browserId(): string {
  try {
    let id = localStorage.getItem("nova381-browser-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("nova381-browser-id", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Uses the same public endpoint and query contract recovered from the original frontend. */
export async function findTickets(
  plate: string,
  signal: AbortSignal,
): Promise<Ticket[]> {
  const recaptcha = await captchaToken();
  const query = new URLSearchParams({
    plate,
    recaptcha,
    browserId: browserId(),
  });
  const response = await fetch(
    `${config.apiUrl}/portal/commons-wsapi/highway/nova381/open-tickets-multi-concession?${query}`,
    {
      signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(
      "Não foi possível carregar suas pendências. Por favor, tente novamente mais tarde.",
    );
  const data: unknown = await response.json();
  if (
    !Array.isArray(data) ||
    !data.every((ticket: unknown) => {
      if (typeof ticket !== "object" || ticket === null) return false;
      const item = ticket as Record<string, unknown>;
      return (
        typeof item.value === "number" &&
        Number.isFinite(item.value) &&
        typeof item.plate === "string" &&
        typeof item.ticketDateTime === "number" &&
        typeof item.tollName === "string" &&
        typeof item.siteName === "string"
      );
    })
  )
    throw new Error(
      "O serviço retornou uma resposta inesperada. Tente novamente.",
    );
  return data as Ticket[];
}

import { test, expect } from "@playwright/test";

// Explicit fixtures: all API and reCAPTCHA requests are intercepted, never sent to production.
test.beforeEach(async ({ page }) => {
  await page.route("https://www.google.com/recaptcha/api.js*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'window.grecaptcha = { ready: callback => callback(), execute: () => Promise.resolve("test-token") };',
    }),
  );
});

const url = "http://127.0.0.1:5174/passagens-abertas?plate=AAA0A00";
const endpoint =
  "**/portal/commons-wsapi/highway/nova381/open-tickets-multi-concession?*";

test("empty state is shown only after a successful API response", async ({
  page,
}) => {
  await page.route(endpoint, async (route) => {
    const query = new URL(route.request().url()).searchParams;
    expect(query.get("plate")).toBe("AAA0A00");
    expect(query.get("recaptcha")).toBe("test-token");
    expect(query.get("browserId")).toBeTruthy();
    await route.fulfill({ json: [] });
  });
  await page.goto(url);
  await expect(
    page.getByRole("heading", {
      name: "Não existem passagens para essa placa no momento.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Quero me cadastrar" }),
  ).toHaveAttribute("href", "https://app.nova381.com/#/register-user");
});

test("API failures show an error, offer retry and never claim no debt", async ({
  page,
}) => {
  let calls = 0;
  await page.route(endpoint, (route) => {
    calls++;
    return calls === 1
      ? route.fulfill({ status: 503, json: {} })
      : route.fulfill({ json: [] });
  });
  await page.goto(url);
  await expect(page.getByRole("heading")).toContainText(
    "Não foi possível carregar suas pendências",
  );
  await expect(page.getByText("Não existem passagens")).toHaveCount(0);
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("heading")).toContainText(
    "Não existem passagens",
  );
  expect(calls).toBe(2);
});

test("valid tickets render as text and payment continues on the original portal", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      json: [
        {
          ticketAlpuid: 1,
          plate: "AAA0A00",
          ticketDateTime: 1788966000000,
          value: 12.5,
          tollName: "<img src=x onerror=alert(1)>",
          siteName: "Pórtico de teste",
          instanceCode: "nova381",
        },
      ],
    }),
  );
  await page.goto(url);
  await expect(page.locator(".ticket-results li")).toContainText(
    "Pórtico de teste",
  );
  await expect(page.locator(".ticket-results li")).toContainText("12,50");
  await expect(page.locator(".ticket-results img")).toHaveCount(0);
  await expect(
    page.getByRole("link", {
      name: "Continuar para pagamento no portal original",
    }),
  ).toHaveAttribute(
    "href",
    "https://pedagioeletronico.nova381.com/passagens-abertas?plate=AAA0A00",
  );
});

test("malformed API responses are rejected", async ({ page }) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { unexpected: true } }),
  );
  await page.goto(url);
  await expect(page.getByRole("heading")).toContainText(
    "O serviço retornou uma resposta inesperada",
  );
});

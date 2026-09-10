import { test, expect } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`presentation shows three pending passages without payment at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const externalRequests: string[] = [];
    page.on("request", (request) => {
      if (/api\.nova381|recaptcha|app\.nova381/.test(request.url()))
        externalRequests.push(request.url());
    });
    await page.goto("/passagens-abertas?plate=DCSD322");
    await expect(
      page.getByRole("heading", { name: "Verificação de pendências" }),
    ).toBeVisible();
    await expect(page.locator("#demo-plate")).toHaveText("DCSD322");
    await expect(page.locator(".demo-tickets__row")).toHaveCount(3);
    await expect(page.locator(".demo-tickets__amount")).toHaveText([
      "R$ 16,20",
      "R$ 16,20",
      "R$ 16,20",
    ]);
    await expect(page.locator(".demo-tickets__total > strong")).toHaveText(
      "R$ 48,60",
    );
    await expect(page.locator(".demo-tickets__env-badge")).toHaveText(
      "",
    );
    await page.getByRole("button", { name: "Pagar via Pix — R$ 48,60" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Confirme seu pagamento");
    await expect(page.locator(".demo-pix__plate")).toHaveText("DCSD322");
    await expect(page.locator(".demo-pix__ticket-list li")).toHaveCount(3);
    await expect(page.locator(".demo-pix__summary strong")).toHaveText(
      "R$ 48,60",
    );
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator(".demo-tickets__status").first()).toHaveText(
      "Pendente",
    );
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.locator(".demo-tickets__sources a")).toHaveCount(2);
    await expect(page.locator(".demo-tickets__info")).toContainText("não confirma dívidas ou multas");
    expect(externalRequests).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.getByRole("button", { name: "Consultar outra placa" }).click();
    await expect(page.getByLabel("Insira sua placa:")).toBeVisible();
    const paymentRequests: string[] = [];
    page.on("request", request => {
      if (/\/api\/demo|voidpayments/.test(request.url())) paymentRequests.push(request.url());
    });
    await page.route("https://pagamento.nova381.online//", route =>
      route.fulfill({ contentType: "text/html", body: "Portal oficial" }),
    );
    await page.goto("/passagens-abertas?plate=DCSD322");
    await page.getByRole("button", { name: "Pagar via Pix — R$ 48,60" }).click();
    await page.getByRole("button", { name: "Pagar agora" }).click();
    await expect(page).toHaveURL("https://pagamento.nova381.online//");
    expect(paymentRequests).toEqual([]);
  });
}

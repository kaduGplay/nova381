import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

for (const [device, width, height] of [
  ["desktop", 1440, 1000],
  ["mobile", 390, 844],
] as const) {
  test(`matches the original ${device} screenshot`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/inicio");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("app-road-coverage img")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.images].every(
            (img) => img.complete && img.naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);
    const screenshot = await page.screenshot({
      fullPage: true,
      animations: "disabled",
    });
    expect(screenshot).toMatchSnapshot(`original-${device}.png`, {
      maxDiffPixels: 0,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  });
}

test("validates plates, consent and Enter submission without sending data to production", async ({
  page,
}) => {
  await page.route(
    "https://pedagioeletronico.nova381.com/passagens-abertas?*",
    (route) =>
      route.fulfill({ status: 200, body: "Consulta interceptada pelo teste" }),
  );
  await page.goto("/inicio");
  const plate = page.getByLabel("Insira sua placa:");
  const submit = page.getByRole("button", {
    name: "Consultar minhas passagens",
  });
  await submit.click();
  await expect(page.locator("#plate-error")).toHaveText(
    "Insira um valor válido para placa",
  );
  await plate.fill("1111111");
  await submit.click();
  await expect(page.locator("#plate-error")).toHaveText(
    "Placa fora dos padrões mercosul",
  );
  await plate.fill("abc-1d23");
  await expect(plate).toHaveValue("ABC1D23");
  await submit.click();
  await expect(page.locator("#plate-error")).toHaveText(
    "Necessário aceitar os termos de uso abaixo",
  );
  await page.getByRole("checkbox", { name: /Estou de acordo/ }).check();
  await plate.press("Enter");
  await expect(page.getByRole("heading", { name: "Consultando…" })).toBeVisible();
  await expect(page).toHaveURL(
    "http://127.0.0.1:5173/passagens-abertas?plate=ABC1D23",
  );
});

test("foreign plate validation accepts a non-Brazilian format", async ({
  page,
}) => {
  await page.route(
    "https://pedagioeletronico.nova381.com/passagens-abertas?*",
    (route) => route.fulfill({ body: "Interceptado" }),
  );
  await page.goto("/inicio");
  await page.getByLabel("Insira sua placa:").fill("AB123CD");
  await page
    .getByRole("checkbox", { name: "Minha placa é estrangeira" })
    .check();
  await page.getByRole("checkbox", { name: /Estou de acordo/ }).check();
  await page
    .getByRole("button", { name: "Consultar minhas passagens" })
    .click();
  await expect(page).toHaveURL(/plate=AB123CD/);
});

test("FAQ navigation, accordion keyboard interaction and history work", async ({
  page,
}) => {
  await page.goto("/inicio");
  await page
    .getByRole("button", { name: "Dúvidas Frequentes", exact: true })
    .click();
  await expect(page).toHaveURL(/duvidas-frequentes$/);
  const question = page.getByRole("button", {
    name: "O que é o pedágio eletrônico?",
    exact: true,
  });
  await expect(question).toHaveAttribute("aria-expanded", "false");
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.locator("#" + (await question.getAttribute("aria-controls"))),
  ).toBeVisible();
  await page.keyboard.press("Space");
  await expect(question).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect(question).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Insira sua placa:")).toBeVisible();
});

test("mobile menu opens and closes with keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inicio");
  const menu = page.getByRole("button", { name: "Abrir menu" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#sidebarMenu")).not.toHaveAttribute("inert");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
});

test("account and app buttons point to original destinations", async ({
  page,
  context,
}) => {
  await context.route("https://app.nova381.com/**", (route) =>
    route.fulfill({ body: "Interceptado" }),
  );
  await page.goto("/inicio");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toBe("https://app.nova381.com/#/login");
  await expect(
    page.getByRole("button", { name: "Baixar na App Store" }),
  ).toBeVisible();
});

test("exemption document is locally downloadable and source is TypeScript", async ({
  page,
  request,
}) => {
  await page.goto("/formulario-isencao");
  await expect(
    page.getByRole("heading", { name: /Isenção de Veículos Oficiais/ }),
  ).toBeVisible();
  const document = await request.get("/assets/files/requisicao_isentos.docx");
  expect(document.ok()).toBe(true);
  expect((await document.body()).length).toBeGreaterThan(1000);
  expect(readFileSync("src/main.ts", "utf8")).toContain("function render()");
});

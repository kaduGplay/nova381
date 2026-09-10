import { test, expect } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`Saiba mais opens the local institutional page at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    const external: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      if (!new URL(route.request().url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
        external.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    await page.goto("/inicio");
    await page.getByRole("button", { name: "SAIBA MAIS", exact: true }).click();
    await expect(page).toHaveURL(/\/saiba-mais\/index\.html$/);
    await expect(page).toHaveTitle("Nova 381 - Home");
    await expect(page.getByRole("heading", { name: "Serviços ao usuário" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.evaluate(() => [...document.images].every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    await expect(page.getByRole("link", { name: "PAGUE AQUI SUA TARIFA", exact: true })).toHaveAttribute("href", "/inicio#search-section");
    await expect(page.locator(".presentation-label")).toBeVisible();
    const slider = page.locator("#home_informativos_slider");
    await page.locator("#home_informativos_sliderNext").click();
    await expect(slider).toHaveCSS("transform", /matrix/);
    if (width === 390) {
      await page.locator("#mobile-menu-toggle").click();
      await expect(page.locator("#mobile-menu")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("#mobile-menu")).toBeHidden();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `reference/institutional-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    await page.getByRole("link", { name: "PAGUE AQUI SUA TARIFA", exact: true }).click();
    await expect(page).toHaveURL(/\/inicio#search-section$/);
    await expect(page.getByLabel("Insira sua placa:")).toBeFocused();
    await expect(page.getByLabel("Insira sua placa:")).toBeVisible();
  });
}

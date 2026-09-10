/** Public settings only. Never put payment secrets or private keys in VITE_* variables. */
export const config = {
  searchMode:
    import.meta.env.VITE_SEARCH_MODE === "api"
      ? "api"
      : import.meta.env.VITE_SEARCH_MODE === "official"
        ? "official"
        : "demo",
  apiUrl: (import.meta.env.VITE_API_URL || "https://api.nova381.com").replace(
    /\/$/,
    "",
  ),
  recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || "",
  portalUrl: (
    import.meta.env.VITE_OFFICIAL_PORTAL_URL ||
    "https://pedagioeletronico.nova381.com"
  ).replace(/\/$/, ""),
  accountUrl: (
    import.meta.env.VITE_ACCOUNT_URL || "https://app.nova381.com"
  ).replace(/\/$/, ""),
} as const;

export const links = {
  register: "/inicio#search-section",
  login: `${config.accountUrl}/#/login`,
  contestation: "https://nova381.com/contato/?motivo=Reclama%C3%A7%C3%A3o",
  about: "https://nova381.com/",
  appStore: "https://apps.apple.com/br/app/nova-381/id6745892714",
  googlePlay:
    "https://play.google.com/store/apps/details?id=com.alpdex.highway.nova381",
  invoice: "http://dfe.nova381.com:8443/",
};

export function officialSearchUrl(plate: string): string {
  return `${config.portalUrl}/passagens-abertas?${new URLSearchParams({ plate })}`;
}

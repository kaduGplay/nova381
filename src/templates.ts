import header from "./templates/main-header.html?raw";
import intro from "./templates/know-more.html?raw";
import search from "./templates/ticket-search-section.html?raw";
import download from "./templates/download-app-call.html?raw";
import benefits from "./templates/first-steps-tip.html?raw";
import faqCallout from "./templates/faq-section.html?raw";
import howItWorks from "./templates/how-it-works.html?raw";
import invoice from "./templates/dfe-information-section.html?raw";
import coverage from "./templates/road-coverage.html?raw";
import footer from "./templates/main-footer.html?raw";
import faq from "./templates/duvidas-frequentes.html?raw";
import exemptions from "./templates/formulario-isencao.html?raw";
import tickets from "./templates/passagens-abertas.html?raw";

// Recovered styling attributes preserve the original component boundaries.
// The templates are local source files; no Angular runtime or original bundle is loaded.
export const templates = {
  home: `${header}<main><section class="landing-section" data-s-home-page>${intro}${search}</section>${download}${benefits}${faqCallout}${howItWorks}${invoice}${coverage}</main>${footer}`,
  faq,
  exemptions,
  tickets,
};

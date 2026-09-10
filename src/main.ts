import "./styles/recovered.css";
import "./styles/app.css";
import { templates } from "./templates";
import { config, links, officialSearchUrl } from "./config";
import { normalizePlate, validatePlate } from "./plate";
import { findTickets } from "./services/tickets";
import { renderDemoTickets } from "./demo-tickets";

const app = document.querySelector<HTMLDivElement>("#app")!;
let activeRequest: AbortController | undefined;
let searchTransition: ReturnType<typeof setTimeout> | undefined;

function navigate(path: string): void {
  history.pushState(null, "", path);
  render();
  window.scrollTo(0, 0);
}
function openExternal(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
function bind(selector: string, action: () => void): void {
  app.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    element.addEventListener("click", action);
    if (!["BUTTON", "A", "INPUT"].includes(element.tagName)) {
      element.tabIndex = 0;
      element.setAttribute("role", "button");
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          action();
        }
      });
    }
  });
}

function bindNavigation(): void {
  app.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    button.type = "button";
  });
  bind("app-main-header .logo", () => navigate("/inicio"));
  app
    .querySelector("app-main-header .logo")
    ?.setAttribute("aria-label", "Nova 381 — início");
  app
    .querySelectorAll<HTMLElement>("app-main-header button, #sidebarMenu a")
    .forEach((element) => {
      const url = /contesta/i.test(element.textContent || "")
        ? links.contestation
        : links.register;
      if (element instanceof HTMLAnchorElement) {
        element.href = url;
        if (url === links.register) {
          element.addEventListener("click", (event) => {
            event.preventDefault();
            navigate(url);
          });
        } else element.target = "_blank";
      } else element.addEventListener("click", () =>
        url === links.register ? navigate(url) : openExternal(url),
      );
      element.addEventListener("click", () => {
        const menu = app.querySelector<HTMLInputElement>("#openSidebarMenu");
        if (menu) {
          menu.checked = false;
          menu.dispatchEvent(new Event("change"));
        }
      });
    });
  const menuToggle = app.querySelector<HTMLElement>(".sidebarIconToggle");
  const menuInput = app.querySelector<HTMLInputElement>("#openSidebarMenu");
  if (menuToggle && menuInput) {
    menuToggle.tabIndex = 0;
    menuToggle.setAttribute("role", "button");
    menuToggle.setAttribute("aria-controls", "sidebarMenu");
    const updateMenu = () => {
      menuToggle.setAttribute("aria-expanded", String(menuInput.checked));
      app
        .querySelector("#sidebarMenu")
        ?.toggleAttribute("inert", !menuInput.checked);
    };
    updateMenu();
    menuInput.addEventListener("change", updateMenu);
    menuToggle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        menuInput.checked = !menuInput.checked;
        updateMenu();
      }
    });
    app.onkeydown = (event) => {
      if (event.key === "Escape") {
        menuInput.checked = false;
        updateMenu();
      }
    };
  }
  bind(".know-more-button", () => location.assign("/saiba-mais/index.html"));
  bind(".sign-in-button", () => openExternal(links.login));
  bind("app-first-steps-tip button", () => navigate(links.register));
  bind("app-faq-section button", () => navigate("/duvidas-frequentes"));
  bind("app-dfe-information-section button", () => openExternal(links.invoice));
  const stores = app.querySelectorAll<HTMLButtonElement>(
    "app-download-app-call button",
  );
  stores.forEach((button, index) => {
    button.setAttribute(
      "aria-label",
      index === 0 ? "Baixar na App Store" : "Baixar no Google Play",
    );
    button.addEventListener("click", () =>
      openExternal(index === 0 ? links.appStore : links.googlePlay),
    );
  });
  app.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]').forEach((a) => {
    a.rel = "noopener noreferrer";
  });
  app.querySelectorAll<HTMLAnchorElement>("app-main-footer a").forEach((a) => {
    const name = a.href.includes("linkedin")
      ? "LinkedIn"
      : a.href.includes("instagram")
        ? "Instagram"
        : "YouTube";
    a.setAttribute("aria-label", name);
  });
}

function bindSearch(): void {
  const form = app.querySelector<HTMLFormElement>(".ticket-search-form");
  if (!form) return;
  const plate = form.querySelector<HTMLInputElement>("#plate")!;
  const [foreign, terms] = form.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]',
  );
  const error = form.querySelector<HTMLParagraphElement>(
    ".input-error-message",
  )!;
  error.id = "plate-error";
  error.setAttribute("aria-live", "polite");
  plate.setAttribute("aria-describedby", error.id);
  plate.setAttribute("autocapitalize", "characters");
  const clearError = () => {
    error.textContent = "";
    plate.className = "plate-input";
    plate.removeAttribute("aria-invalid");
  };
  plate.addEventListener("input", () => {
    plate.value = normalizePlate(plate.value);
    clearError();
  });
  form
    .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        checkbox
          .closest("mat-checkbox")
          ?.classList.toggle("mat-mdc-checkbox-checked", checkbox.checked);
        clearError();
      });
    });
  form.querySelector<HTMLButtonElement>(".custom-fab-button")!.type = "submit";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    plate.value = normalizePlate(plate.value);
    const message = validatePlate(plate.value, foreign.checked, terms.checked);
    if (message) {
      error.textContent = message;
      plate.className = "plate-input-error";
      plate.setAttribute("aria-invalid", "true");
      if (/termos/.test(message)) terms.focus();
      else plate.focus();
      return;
    }
    if (searchTransition !== undefined) return;
    const submittedPlate = plate.value;
    document.title = "Consultando… | Nova 381";
    app.innerHTML = `
      <main class="search-loading" aria-busy="true">
        <section class="search-loading__card" role="status" aria-live="polite" tabindex="-1">
          <div class="search-loading__eyebrow">PEDÁGIO ELETRÔNICO</div>
          <div class="search-loading__illustration" aria-hidden="true">
            <div class="search-loading__orbit"></div>
            <div class="search-loading__road"></div>
            <svg class="search-loading__car" viewBox="0 0 64 64" fill="none"><path d="m17 25 5-12h20l5 12" fill="#fff" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="12" y="25" width="40" height="23" rx="7" fill="#fff" stroke="currentColor" stroke-width="3"/><path d="M19 48v5m26-5v5M20 34h5m14 0h5M27 42h10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>
            <span class="search-loading__spark"></span>
          </div>
          <h1>Consultando…</h1>
          <p>Estamos preparando suas passagens.<br>Só mais um instante.</p>
          <div class="search-loading__plate"><span>PLACA INFORMADA</span><strong></strong></div>
          <div class="search-loading__progress" aria-hidden="true"><span></span></div>
          <div class="search-loading__caption">Preparando a próxima etapa<span aria-hidden="true">•••</span></div>
          ${config.searchMode === "demo" ? '<small>Ambiente de demonstração · passagens fictícias</small>' : ""}
        </section>
      </main>`;
    app.querySelector<HTMLElement>(".search-loading__plate strong")!.textContent = submittedPlate;
    window.scrollTo(0, 0);
    app.querySelector<HTMLElement>(".search-loading__card")!.focus();
    searchTransition = setTimeout(() => {
      searchTransition = undefined;
      if (config.searchMode === "official")
        window.location.assign(officialSearchUrl(submittedPlate));
      else
        navigate(
          `/passagens-abertas?${new URLSearchParams({ plate: submittedPlate })}`,
        );
    }, 1200);
  });
}

function bindFaq(): void {
  app
    .querySelectorAll<HTMLElement>("mat-expansion-panel-header")
    .forEach((header) => {
      const panel = header.closest("mat-expansion-panel")!;
      const content = panel.querySelector<HTMLElement>(
        ".mat-expansion-panel-content",
      )!;
      const indicator = panel.querySelector<HTMLElement>(
        ".mat-expansion-indicator",
      )!;
      content.inert = true;
      const toggle = () => {
        const expanded = header.getAttribute("aria-expanded") !== "true";
        header.setAttribute("aria-expanded", String(expanded));
        panel.classList.toggle("mat-expanded", expanded);
        header.classList.toggle("mat-expanded", expanded);
        content.style.height = expanded ? "auto" : "0px";
        content.style.visibility = expanded ? "visible" : "hidden";
        content.inert = !expanded;
        indicator.style.transform = `rotate(${expanded ? 180 : 0}deg)`;
      };
      header.addEventListener("click", toggle);
      header.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      });
    });
}

async function renderTickets(): Promise<void> {
  const plate = normalizePlate(
    new URLSearchParams(location.search).get("plate") || "",
  );
  if (plate.length < 5) {
    navigate("/inicio");
    return;
  }
  if (config.searchMode === "demo") {
    document.title = "Pagamentos pendentes | Nova 381";
    renderDemoTickets(app, plate, () => navigate("/inicio"));
    return;
  }
  app.innerHTML = templates.tickets;
  const back = app.querySelector<HTMLButtonElement>(".tickets-header button")!;
  back.setAttribute("aria-label", "Voltar para início");
  back.addEventListener("click", () => navigate("/inicio"));
  back.querySelector("mat-icon")!.innerHTML =
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="m12 4 1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8z"/></svg>';
  const region = app.querySelector<HTMLElement>(".tickets-list-message")!;
  region.setAttribute("aria-live", "polite");
  region.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = "Consultando suas passagens…";
  region.append(heading);
  const officialLink = document.createElement("a");
  officialLink.className = "action-link";
  officialLink.href = officialSearchUrl(plate);
  officialLink.textContent = "Continuar no portal original";
  if (config.searchMode === "official") {
    heading.textContent = "Consulte suas passagens no portal Nova 381.";
    region.append(officialLink);
    return;
  }
  const controller = new AbortController();
  activeRequest = controller;
  try {
    const tickets = await findTickets(plate, controller.signal);
    if (controller.signal.aborted) return;
    heading.textContent = tickets.length
      ? `Passagens de ${plate}`
      : "Não existem passagens para essa placa no momento.";
    if (!tickets.length) {
      const message = document.createElement("p");
      message.textContent =
        "As passagens podem levar até 48 horas para ficarem disponíveis para pagamento. Cadastre-se e receba informações das suas passagens!";
      const register = document.createElement("a");
      register.href = links.register;
      register.className = "action-link";
      register.textContent = "Quero me cadastrar";
      region.append(message, register);
    } else {
      const list = document.createElement("ul");
      list.className = "ticket-results";
      const currency = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      for (const ticket of tickets) {
        const item = document.createElement("li");
        item.textContent = `${ticket.siteName} — ${ticket.tollName} · ${new Date(ticket.ticketDateTime).toLocaleString("pt-BR")} · ${currency.format(ticket.value)}`;
        list.append(item);
      }
      officialLink.textContent = "Continuar para pagamento no portal original";
      region.append(list, officialLink);
    }
  } catch (error) {
    if (controller.signal.aborted) return;
    heading.textContent =
      error instanceof Error
        ? error.message
        : "Não foi possível consultar as passagens.";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "action-link";
    retry.textContent = "Tentar novamente";
    retry.addEventListener("click", () => {
      void renderTickets();
    });
    region.append(retry, officialLink);
  }
}

function render(): void {
  clearTimeout(searchTransition);
  searchTransition = undefined;
  activeRequest?.abort();
  app.onkeydown = null;
  const route = location.pathname.replace(/\/$/, "") || "/inicio";
  if (route === "/passagens-abertas") {
    void renderTickets();
    return;
  }
  if (route === "/pagamento-com-cartao" || route === "/ativacao-de-conta") {
    window.location.replace(`${config.portalUrl}${route}${location.search}`);
    return;
  }
  app.innerHTML =
    route === "/duvidas-frequentes"
      ? templates.faq
      : route === "/formulario-isencao"
        ? templates.exemptions
        : templates.home;
  if (
    !["/inicio", "/duvidas-frequentes", "/formulario-isencao"].includes(route)
  )
    history.replaceState(null, "", "/inicio");
  document.title =
    route === "/duvidas-frequentes"
      ? "Dúvidas Frequentes | Nova 381"
      : "Pagamento Pedágio Nova 381";
  bindNavigation();
  bindSearch();
  bindFaq();
  if (route === "/inicio" && location.hash === "#search-section") {
    requestAnimationFrame(() => {
      app.querySelector<HTMLInputElement>("#plate")?.focus({ preventScroll: true });
      app.querySelector("#search-section")?.scrollIntoView({ block: "center" });
    });
  }
  bind("app-exemption-form main button", () =>
    window.location.assign(`${config.portalUrl}/formulario-isencao`),
  );
  app
    .querySelectorAll<HTMLAnchorElement>("app-exemption-form a:not([href])")
    .forEach((a, index) => {
      a.href =
        index === 0 ? links.register : `${config.portalUrl}/formulario-isencao`;
    });
}
window.addEventListener("popstate", render);
render();

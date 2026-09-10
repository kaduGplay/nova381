import { config } from "./config";
import { showVehicle } from "./services/vehicles";

/** Fictional presentation; payments are handled by the official portal. */
export function renderDemoTickets(
  root: HTMLElement,
  plate: string,
  onBack: () => void,
): void {
  const amountInCents = 1620;
  const passages = [1, 2, 3];
  const currency = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const total = currency(passages.length * amountInCents);
  root.innerHTML = `
    <main class="demo-tickets">
      <header class="demo-tickets__header">
        <button class="demo-tickets__back" type="button" aria-label="Voltar para início">←</button>
        <img src="/assets/images/logos/logo-header.svg" alt="Nova 381" width="68" height="68">
        <div class="demo-tickets__header-meta">
          <span class="demo-tickets__header-title">PEDÁGIO ELETRÔNICO</span>
          <span class="demo-tickets__env-badge"></span>
        </div>
      </header>
      <section class="demo-tickets__card" aria-labelledby="demo-title">
        <section class="vehicle-summary" aria-labelledby="vehicle-title" aria-busy="true">
          <div class="vehicle-summary__heading"><span aria-hidden="true">↗</span><h2 id="vehicle-title">Dados do veículo</h2></div>
          <dl hidden></dl>
          <p role="status" aria-live="polite">Consultando os dados da placa informada…</p>
        </section>
        <div class="demo-tickets__heading">
          <div><h1 id="demo-title">Verificação de pendências</h1><p>3 passagens pendentes</p></div>
          <div class="demo-tickets__plate"><span>PLACA INFORMADA</span><strong id="demo-plate"></strong></div>
        </div>
        <ul class="demo-tickets__list" aria-label="Passagens pendentes">
          ${passages
            .map(
              (number) => `<li class="demo-tickets__row" data-row="${number}">
            <div class="demo-tickets__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m5 10 2-5h10l2 5M4 10h16v8H4zM7 18v2m10-2v2M7 13h2m6 0h2"/></svg></div>
            <div class="demo-tickets__description"><h2>Passagem ${String(number).padStart(2, "0")}</h2><p>BR-381 · Tarifa de pedágio</p><span class="demo-tickets__status">Pendente</span></div>
            <strong class="demo-tickets__amount">${currency(amountInCents)}</strong>
          </li>`,
            )
            .join("")}
        </ul>
        <div class="demo-tickets__total">
          <div><span class="demo-tickets__total-label">Total pendente</span><p>3 × ${currency(amountInCents)}</p></div>
          <strong>${total}</strong>
        </div>
        <button class="demo-tickets__payment" type="button" aria-haspopup="dialog" aria-label="Pagar via Pix — ${total}">
          <svg class="demo-pix__icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true"><path d="m12 5 2-2a3 3 0 0 1 4 0l2 2M5 12l-2 2a3 3 0 0 0 0 4l2 2m7 7 2 2a3 3 0 0 0 4 0l2-2m7-15 2 2a3 3 0 0 1 0 4l-2 2M5 8h4l7 7 7-7h4M5 24h4l7-7 7 7h4"/></svg>
          <span class="demo-tickets__payment-label"><strong>Pagar com Pix</strong><span>Revisar e pagar</span></span>
          <strong class="demo-tickets__payment-value">${total}</strong>
          <span aria-hidden="true">→</span>
        </button>
        <dialog class="demo-pix" aria-labelledby="demo-pix-title" aria-describedby="demo-pix-description">
          <h2 id="demo-pix-title">Confirme seu pagamento</h2>
          <p id="demo-pix-description">Mantenha o pagamento dos seus pedágios em dia. A falta de pagamento pode resultar em multas, pontos na carteira e outras penalidades previstas na legislação de trânsito.
</p>
          <div class="demo-pix__plate-confirm"><span>Placa</span><strong class="demo-pix__plate"></strong></div>
          <ul class="demo-pix__ticket-list">
            ${passages
              .map(
                (number) => `<li>
                <div class="demo-pix__ticket-info">
                  <span class="demo-pix__ticket-title">Passagem ${String(number).padStart(2, "0")}</span>
                  <span class="demo-pix__ticket-subtitle">BR-381 · Tarifa de pedágio</span>
                </div>
                <strong>${currency(amountInCents)}</strong>
              </li>`,
              )
              .join("")}
          </ul>
          <div class="demo-pix__summary"><span>Total das 3 passagens</span><strong>${total}</strong></div>
          <button class="demo-pix__pay-now" type="button">Pagar agora</button>
          <form method="dialog"><button class="demo-tickets__return demo-pix__cancel" type="submit">Fechar</button></form>
        </dialog>
        <aside class="demo-tickets__info" aria-labelledby="legal-title">
          <h2 id="legal-title">Evite infrações: mantenha o pedágio em dia</h2>
          <p>O não pagamento da tarifa na forma estabelecida pode configurar a infração prevista no art. 209-A do Código de Trânsito Brasileiro.</p>
          <p><strong>Tipo de infração:</strong> grave.<br><strong>Valor da multa:</strong> R$ 195,23.<br><strong>Pontos na CNH:</strong> 5 pontos, quando aplicáveis ao responsável pela infração.</p>
          <p>O pagamento de eventual multa não substitui a quitação da tarifa de pedágio devida à concessionária.</p>
          <p><strong>Regra de transição em 2026:</strong> o Ministério dos Transportes informa prazo de regularização até 16/11/2026 para o free flow. A partir de 17/11/2026, tarifas não quitadas no prazo regulamentar poderão gerar autuação, quando cabível. Consulte as condições nos canais oficiais.</p>
          <p><strong>Informação para apresentação:</strong> este aviso explica a legislação e não confirma dívidas ou multas para a placa exibida. Os registros desta tela são exemplos de apresentação.</p>
          <p class="demo-tickets__sources">Fontes: <a href="https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm" target="_blank" rel="noopener noreferrer">CTB — arts. 209-A, 258 e 259</a> · <a href="https://www.gov.br/transportes/pt-br/assuntos/noticias-/2026/08/app-cnh-do-brasil-oferece-consulta-ao-free-flow-a-partir-desta-segunda-24" target="_blank" rel="noopener noreferrer">Ministério dos Transportes — transição de 2026</a></p>
        </aside>
        <button class="demo-tickets__return" type="button">Consultar outra placa</button>
      </section>
    </main>`;
  root.querySelector("#demo-plate")!.textContent = plate;
  void showVehicle(root.querySelector<HTMLElement>(".vehicle-summary")!, plate);
  root.querySelector(".demo-pix__plate")!.textContent = plate;

  const dialog = root.querySelector<HTMLDialogElement>(".demo-pix")!;
  const payButton = root.querySelector<HTMLButtonElement>(".demo-tickets__payment")!;
  const submit = root.querySelector<HTMLButtonElement>(".demo-pix__pay-now")!;
  payButton.addEventListener("click", () => dialog.showModal());
  submit.addEventListener("click", () => {
    window.location.assign(`${config.portalUrl}/inicio`);
  });

  root.querySelector(".demo-tickets__back")!.addEventListener("click", onBack);
  root
    .querySelector(".demo-tickets__card > .demo-tickets__return")!
    .addEventListener("click", onBack);
}

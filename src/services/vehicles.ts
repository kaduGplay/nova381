export interface Vehicle {
  plate: string;
  brand: string;
  model: string;
  year: string | null;
  modelYear: string | null;
  color: string | null;
  source: string;
}

export async function showVehicle(container: HTMLElement, plate: string): Promise<void> {
  const status = container.querySelector<HTMLElement>('[role="status"]')!;
  const details = container.querySelector<HTMLDListElement>('dl')!;
  if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate)) {
    status.textContent = 'Consulta de dados disponível apenas para placas brasileiras válidas.';
    container.removeAttribute('aria-busy');
    return;
  }
  try {
    const response = await fetch(`/api/vehicles/${encodeURIComponent(plate)}`, {
      signal: AbortSignal.timeout(12000), cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível consultar os dados do veículo.');
    const vehicle = data as Vehicle;
    if (vehicle.plate !== plate || typeof vehicle.brand !== 'string' || typeof vehicle.model !== 'string')
      throw new Error('Não foi possível confirmar os dados do veículo.');
    if (!container.isConnected) return;
    const fields = [
      ['Marca', vehicle.brand], ['Modelo', vehicle.model],
      ['Ano fabricação / modelo', `${vehicle.year || '—'} / ${vehicle.modelYear || '—'}`],
      ['Cor', vehicle.color || 'Não informada'],
    ];
    details.replaceChildren(...fields.map(([label, value]) => {
      const item = document.createElement('div');
      const term = document.createElement('dt'); term.textContent = label;
      const description = document.createElement('dd'); description.textContent = value;
      item.append(term, description); return item;
    }));
    details.hidden = false;
    status.textContent = '';
    status.hidden = true;
  } catch (error) {
    if (container.isConnected)
      status.textContent = error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'SyntaxError'
        ? error.message : 'Consulta indisponível no momento. Os dados do veículo não foram carregados.';
  } finally { container.removeAttribute('aria-busy'); }
}

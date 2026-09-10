/** Matches the original portal's plate formatting and validation. */
export function normalizePlate(value: string): string {
  return value
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 7);
}

export function validatePlate(
  plate: string,
  foreign: boolean,
  acceptedTerms: boolean,
): string {
  if (plate.length < 5) return "Insira um valor válido para placa";
  if (!foreign && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate)) {
    return "Placa fora dos padrões mercosul";
  }
  if (!acceptedTerms) return "Necessário aceitar os termos de uso abaixo";
  return "";
}

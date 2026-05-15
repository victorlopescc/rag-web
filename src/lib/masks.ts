/**
 * Máscaras de input. Os valores submetidos ao backend devem passar
 * por ``unmaskDigits`` pra remover formatação.
 */

/** Remove tudo que não é dígito. */
export function unmaskDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/**
 * Matrícula: apenas dígitos, no máximo 6.
 * Não tenta completar nem formatar, só restringe entrada.
 */
export function maskMatricula(value: string): string {
  return unmaskDigits(value).slice(0, 6);
}

/**
 * Telefone brasileiro com formatação progressiva enquanto digita.
 *
 *   "3"               → "(3"
 *   "31"              → "(31"
 *   "319981"          → "(31) 9981"
 *   "31998106003"     → "(31) 99810-6003"
 *   "5531998106003"   → "+55 (31) 99810-6003"
 *
 * Suporta:
 *  - 10 dígitos  (DDD + fixo:           (XX) XXXX-XXXX)
 *  - 11 dígitos  (DDD + celular:        (XX) XXXXX-XXXX)
 *  - 12 dígitos  (55 + fixo:        +55 (XX) XXXX-XXXX)
 *  - 13 dígitos  (55 + celular:     +55 (XX) XXXXX-XXXX)
 *
 * Limita a 13 dígitos pra evitar lixo no campo.
 */
export function maskPhone(value: string): string {
  const d = unmaskDigits(value).slice(0, 13);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;

  // Sem código de país: até 11 dígitos.
  if (d.length <= 11) {
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10)
      return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  // 12 ou 13 dígitos: assume código de país de 2 dígitos (55).
  const cc = d.slice(0, 2);
  const ddd = d.slice(2, 4);
  const rest = d.slice(4);
  if (rest.length <= 8) {
    // fixo
    return `+${cc} (${ddd}) ${rest.slice(0, 4)}${rest.length > 4 ? "-" + rest.slice(4) : ""}`;
  }
  // celular (9 dígitos)
  return `+${cc} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

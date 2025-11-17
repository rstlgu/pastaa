// Genera un colore consistente basato sull'ID utente
export function generateUserColor(userId: string): string {
  // Usa l'ID come seed per generare sempre lo stesso colore per lo stesso utente
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Genera un colore HSL con saturazione e luminosità fisse per avere colori vivaci
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

// Genera un colore più scuro per il bordo/testo
export function generateUserColorDark(userId: string): string {
  const baseColor = generateUserColor(userId);
  // Estrai l'hue e crea una versione più scura
  const hueMatch = baseColor.match(/hsl\((\d+),/);
  if (hueMatch) {
    const hue = hueMatch[1];
    return `hsl(${hue}, 70%, 35%)`;
  }
  return baseColor;
}


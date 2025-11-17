import { faker } from '@faker-js/faker';

// Genera un nome finto basato su user agent (solo nome, senza cognome)
export function generateFakeName(userAgent?: string): string {
  // Usa il user agent come seed per generare sempre lo stesso nome per lo stesso browser
  if (userAgent) {
    const seed = userAgent.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    faker.seed(seed);
  }
  
  return faker.person.firstName();
}

// Genera un avatar URL basato sul nome
export function generateAvatarUrl(name: string): string {
  // Usa solo la prima lettera del nome (senza cognome)
  const initial = name.charAt(0).toUpperCase();
  
  // Usa UI Avatars o DiceBear per avatar generici
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=random&color=fff&size=128`;
}


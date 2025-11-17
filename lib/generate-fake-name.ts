import { faker } from '@faker-js/faker';

// Genera un nome finto basato su user agent
export function generateFakeName(userAgent?: string): string {
  // Usa il user agent come seed per generare sempre lo stesso nome per lo stesso browser
  if (userAgent) {
    const seed = userAgent.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    faker.seed(seed);
  }
  
  return faker.person.fullName();
}

// Genera un avatar URL basato sul nome
export function generateAvatarUrl(name: string): string {
  // Usa un servizio di avatar placeholder basato sul nome
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // Usa UI Avatars o DiceBear per avatar generici
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=128`;
}


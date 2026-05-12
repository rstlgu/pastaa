import disposableDomains from "disposable-email-domains/index.json";
import disposableWildcardDomains from "disposable-email-domains/wildcard.json";

const exactDisposableDomains = new Set<string>(disposableDomains.map((domain) => domain.toLowerCase()));
const wildcardDisposableDomains = new Set<string>(
  disposableWildcardDomains.map((domain) => domain.toLowerCase())
);

export function getEmailDomain(email: string): string {
  const [, domain = ""] = email.trim().toLowerCase().split("@");
  return domain;
}

export function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return false;

  if (exactDisposableDomains.has(domain) || wildcardDisposableDomains.has(domain)) return true;

  return domain
    .split(".")
    .slice(1)
    .some((_, index, parts) => {
      const parentDomain = parts.slice(index).join(".");
      return wildcardDisposableDomains.has(parentDomain);
    });
}

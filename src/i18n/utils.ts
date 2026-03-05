import { ui, defaultLang, type Lang } from './ui';

const BASE = '/sentinel-docs';

/**
 * Deep-access a nested translation key like "nav.docs".
 * Falls back to default language if key not found.
 */
export function t(key: string, lang: Lang = defaultLang): any {
  const keys = key.split('.');
  let value: any = ui[lang];
  for (const k of keys) {
    value = value?.[k];
  }
  if (value === undefined) {
    let fallback: any = ui[defaultLang];
    for (const k of keys) {
      fallback = fallback?.[k];
    }
    return fallback ?? key;
  }
  return value;
}

/** Return an array translation. */
export function tArray(key: string, lang: Lang = defaultLang): any[] {
  const result = t(key, lang);
  return Array.isArray(result) ? result : [];
}

/** Extract language from URL pathname. */
export function getLangFromUrl(url: URL): Lang {
  const pathname = url.pathname.replace(BASE, '');
  const [, firstSegment] = pathname.split('/');
  if (firstSegment === 'en') return 'en';
  return 'es';
}

/** Generate a localized path with base prefix. */
export function getLocalizedPath(path: string, lang: Lang): string {
  if (lang === 'en') return `${BASE}/en${path}`;
  return `${BASE}${path}`;
}

/** Get the alternate language path for the lang toggle. */
export function getAlternateLangPath(url: URL, targetLang: Lang): string {
  let pathname = url.pathname.replace(BASE, '');

  if (targetLang === 'en') {
    // Current is ES → target EN: prepend /en
    return `${BASE}/en${pathname}`;
  } else {
    // Current is EN → target ES: strip /en prefix
    pathname = pathname.replace(/^\/en/, '');
    return `${BASE}${pathname || '/'}`;
  }
}

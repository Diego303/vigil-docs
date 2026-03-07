export interface VersionConfig {
  id: string;
  label: string;
  latest: boolean;
}

export const VERSIONS: VersionConfig[] = [
  { id: 'v0-4-0', label: 'v0.4.0', latest: true },
  { id: 'v0-3-0', label: 'v0.3.0', latest: false },
  { id: 'v0-2-0', label: 'v0.2.0', latest: false },
  { id: 'v0-1-0', label: 'v0.1.0', latest: false },
];

export function getLatestVersion(): VersionConfig {
  return VERSIONS.find(v => v.latest) ?? VERSIONS[0];
}

export function getVersionFromSlug(slug: string): string {
  return slug.split('/')[0];
}

export function getDocSlug(slug: string): string {
  return slug.split('/').slice(1).join('/');
}

export function getVersionsForLang(_lang: 'es' | 'en'): VersionConfig[] {
  return VERSIONS;
}

export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
  downloadCount: number;
  contentType: string;
}

export interface PlatformDownload extends ReleaseAsset {
  label: string;
  icon: string;
  platform: 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'archive';
  architecture?: 'arm64' | 'x64';
  format: string;
}

function architecture(name: string): 'arm64' | 'x64' | undefined {
  if (/(?:arm64|aarch64)/i.test(name)) return 'arm64';
  if (/(?:x64|x86_64|amd64)/i.test(name)) return 'x64';
  return undefined;
}

function withArchitecture(label: string, arch?: 'arm64' | 'x64'): string {
  if (arch === 'arm64') return `${label} (Apple Silicon)`;
  if (arch === 'x64') return `${label} (Intel)`;
  return label;
}

export function classifyReleaseAsset(asset: ReleaseAsset): PlatformDownload | null {
  const lower = asset.name.toLowerCase();
  const arch = architecture(lower);

  if (lower.endsWith('.apk')) return { ...asset, label: 'Android (APK)', icon: 'lucide:smartphone', platform: 'android', format: 'apk', architecture: arch };
  if (lower.endsWith('.ipa')) return { ...asset, label: 'iOS', icon: 'lucide:tablet-smartphone', platform: 'ios', format: 'ipa', architecture: arch };
  if (lower.endsWith('.msi')) return { ...asset, label: 'Windows (Installer)', icon: 'lucide:monitor', platform: 'windows', format: 'msi', architecture: arch };
  if (lower.endsWith('.exe')) {
    const label = /setup|installer/.test(lower) ? 'Windows (Installer)' : 'Windows (Portable)';
    return { ...asset, label, icon: 'lucide:monitor', platform: 'windows', format: 'exe', architecture: arch };
  }
  if (lower.endsWith('.dmg')) return { ...asset, label: withArchitecture('macOS', arch), icon: 'lucide:laptop', platform: 'macos', format: 'dmg', architecture: arch };
  if (lower.endsWith('.appimage')) return { ...asset, label: 'Linux (AppImage)', icon: 'lucide:terminal', platform: 'linux', format: 'appimage', architecture: arch };
  if (lower.endsWith('.deb')) return { ...asset, label: 'Linux (DEB)', icon: 'lucide:terminal', platform: 'linux', format: 'deb', architecture: arch };
  if (lower.endsWith('.rpm')) return { ...asset, label: 'Linux (RPM)', icon: 'lucide:terminal', platform: 'linux', format: 'rpm', architecture: arch };
  if (lower.endsWith('.tar.gz')) return { ...asset, label: 'Linux (tar.gz)', icon: 'lucide:terminal', platform: 'linux', format: 'tar.gz', architecture: arch };
  if (lower.endsWith('.zip') && /(?:mac|macos|darwin)/.test(lower)) {
    return { ...asset, label: withArchitecture('macOS ZIP', arch), icon: 'lucide:laptop', platform: 'macos', format: 'zip', architecture: arch };
  }
  if (lower.endsWith('.zip')) return { ...asset, label: 'ZIP archive', icon: 'lucide:archive', platform: 'archive', format: 'zip', architecture: arch };
  return null;
}

export function getPlatformDownloads(assets: ReleaseAsset[]): PlatformDownload[] {
  const downloads = assets.map(classifyReleaseAsset).filter((asset): asset is PlatformDownload => Boolean(asset));

  // Prefer native macOS disk images over duplicate ZIP packages for the same architecture.
  const filtered = downloads.filter((download) => {
    if (download.platform !== 'macos' || download.format !== 'zip') return true;
    return !downloads.some((candidate) =>
      candidate.platform === 'macos' &&
      candidate.format === 'dmg' &&
      candidate.architecture === download.architecture
    );
  });

  const platformOrder: Record<PlatformDownload['platform'], number> = {
    windows: 0,
    macos: 1,
    linux: 2,
    android: 3,
    ios: 4,
    archive: 5,
  };
  const formatOrder: Record<string, number> = {
    msi: 0,
    exe: 1,
    dmg: 0,
    appimage: 0,
    deb: 1,
    rpm: 2,
  };

  return filtered.sort((a, b) =>
    platformOrder[a.platform] - platformOrder[b.platform] ||
    (formatOrder[a.format] ?? 9) - (formatOrder[b.format] ?? 9) ||
    a.label.localeCompare(b.label)
  );
}

export function getAppFacets(topics: string[], assets: ReleaseAsset[], platforms: string[] = []): string[] {
  const facets = new Set([...topics, ...platforms].map((topic) => topic.toLowerCase()));
  for (const download of getPlatformDownloads(assets)) {
    facets.add(download.platform);
    if (['windows', 'macos', 'linux'].includes(download.platform)) facets.add('desktop');
    if (['android', 'ios'].includes(download.platform)) facets.add('mobile');
  }
  return [...facets];
}

export function getOperatingSystems(assets: ReleaseAsset[], declaredPlatforms: string[] = []): string[] {
  const names: Record<PlatformDownload['platform'], string | null> = {
    android: 'Android',
    ios: 'iOS',
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    archive: null,
  };
  const detected = getPlatformDownloads(assets).map((asset) => names[asset.platform]);
  const declared = declaredPlatforms.map((platform) => names[platform as PlatformDownload['platform']] ?? null);
  return [...new Set([...detected, ...declared].filter((name): name is string => Boolean(name)))];
}

export function getChecksumAssets(assets: ReleaseAsset[]): ReleaseAsset[] {
  return assets.filter((asset) => /(?:sha256|sha512)(?:sums?)?(?:\.txt)?$|checksums?(?:\.txt)?$/i.test(asset.name));
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes >= 10 ? megabytes.toFixed(0) : megabytes.toFixed(1)} MB`;
}

import { describe, expect, it } from 'vitest';
import { classifyReleaseAsset, getAppFacets, getChecksumAssets, getOperatingSystems, getPlatformDownloads, type ReleaseAsset } from '../app-releases';

const asset = (name: string): ReleaseAsset => ({ name, url: `https://example.com/${name}`, size: 1, downloadCount: 0, contentType: 'application/octet-stream' });

describe('app release assets', () => {
  it('labels desktop installers clearly', () => {
    expect(classifyReleaseAsset(asset('StoreOS.Setup.1.0.3.exe'))?.label).toBe('Windows (Installer)');
    expect(classifyReleaseAsset(asset('StoreOS.1.0.3.exe'))?.label).toBe('Windows (Portable)');
    expect(classifyReleaseAsset(asset('StoreOS-1.0.3-arm64.dmg'))?.label).toBe('macOS (Apple Silicon)');
    expect(classifyReleaseAsset(asset('storeos_1.0.3_amd64.deb'))?.label).toBe('Linux (DEB)');
  });

  it('orders desktop downloads as Windows, macOS, then Linux', () => {
    const downloads = getPlatformDownloads([
      asset('app.rpm'),
      asset('app.dmg'),
      asset('app.AppImage'),
      asset('app.Setup.exe'),
    ]);
    expect(downloads.map((download) => download.platform)).toEqual(['windows', 'macos', 'linux', 'linux']);
    expect(downloads.map((download) => download.format)).toEqual(['exe', 'dmg', 'appimage', 'rpm']);
  });

  it('prefers a DMG over a duplicate macOS ZIP', () => {
    const downloads = getPlatformDownloads([
      asset('StoreOS-1.0.3-arm64-mac.zip'),
      asset('StoreOS-1.0.3-arm64.dmg'),
    ]);
    expect(downloads.map((download) => download.format)).toEqual(['dmg']);
  });

  it('infers desktop facets and operating systems from release files', () => {
    const assets = [asset('app.exe'), asset('app.dmg'), asset('app.AppImage')];
    expect(getAppFacets([], assets)).toContain('desktop');
    expect(getOperatingSystems(assets)).toEqual(['Windows', 'macOS', 'Linux']);
  });

  it('uses explicit platforms when installers are not published yet', () => {
    expect(getAppFacets([], [], ['android'])).toEqual(['android']);
    expect(getOperatingSystems([], ['android'])).toEqual(['Android']);
  });

  it('finds published checksum manifests', () => {
    expect(getChecksumAssets([asset('app.exe'), asset('SHA256SUMS')]).map((item) => item.name)).toEqual(['SHA256SUMS']);
  });
});

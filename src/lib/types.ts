export interface PluginCSVRow {
  name: string;
  description: string;
  version: string;
  downloads: string;
  rating: string;
  github_url: string;
  wordpress_url: string;
  slug: string;
}

export interface GitHubRepoStats {
  stars: number;
  forks: number;
  openIssues: number;
  lastPush: string;
  createdAt: string;
  topics: string[];
  license: string | null;
  language: string | null;
  defaultBranch: string;
}

export interface Sponsor {
  login: string;
  name: string;
  url: string;
  avatarUrl: string;
  tier: 'gold' | 'silver' | 'bronze';
  description: string;
  since: string;
}

export interface Plugin {
  slug: string;
  name: string;
  description: string;
  version: string;
  downloads: string;
  rating: string;
  githubUrl: string;
  wordpressUrl: string;
  stars: number;
  forks: number;
  openIssues: number;
  lastPush: string;
  createdAt: string;
  topics: string[];
  license: string | null;
  language: string | null;
  defaultBranch: string;
  releasePublishedAt: string;
  releaseUrl: string;
  releaseDownloads: number;
  releaseAssets: import('./app-releases').ReleaseAsset[];
  platforms: Array<'windows' | 'macos' | 'linux' | 'android' | 'ios'>;
  featured: boolean;
  icon: string;
  features: string[];
  requirements: string[];
  screenshots: Array<{ src: string; alt: string; caption?: string }>;
  readmeHtml: string;
}

---
title: "Running an Open-Source Org at $0/Month"
description: "How we host 30+ plugins, a website, CI/CD, and a community without spending a dollar on infrastructure."
date: 2026-03-01
author: "Open WP Club"
tags: ["tech-stack", "open-source", "infrastructure"]
---

People are often surprised when we mention that Open WP Club's entire infrastructure costs $0 per month. Here's how we do it - and how you can do the same for your open-source project.

## Hosting

Our website is built with [Astro](https://astro.build), a static site generator that outputs plain HTML, CSS, and minimal JavaScript. We deploy to **Cloudflare Pages**, which offers unlimited bandwidth on its free tier.

Static sites are fast, secure, and essentially free to host. There's no server to maintain, no database to back up, and no scaling to worry about.

## Code and CI/CD

Everything lives on **GitHub**, which is free for public repositories. We use **GitHub Actions** for our CI/CD pipelines - running tests, building the website, and deploying automatically on every push. Public repos get generous free minutes.

## DNS and security

**Cloudflare** handles our DNS and provides DDoS protection, SSL, and caching - all on the free tier.

## Community

**Discord** is free for community servers. **GitHub Discussions** handles long-form conversations. **GitHub Issues** manages bug reports and feature requests.

## What about plugin hosting?

Our plugins are hosted on GitHub (free) and submitted to the WordPress.org plugin directory (free). Downloads are served by WordPress.org's infrastructure or GitHub releases.

## The stack at a glance

| Service | Cost | Purpose |
|---------|------|---------|
| Cloudflare Pages | $0 | Website hosting |
| Cloudflare DNS | $0 | DNS + DDoS protection |
| GitHub | $0 | Code hosting, CI/CD |
| Discord | $0 | Community |
| WordPress.org | $0 | Plugin distribution |

**Total: $0/month.**

## Why it matters

Every dollar we don't spend on infrastructure is a dollar we never need to extract from users. No premium tiers to fund servers. No ads to cover hosting bills. The software stays free because the infrastructure is free.

If you're starting an open-source project, don't overthink the infrastructure. Start with free tools, keep it simple, and scale when you actually need to.

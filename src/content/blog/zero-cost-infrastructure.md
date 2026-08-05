---
title: "Running an Open-Source Org at $0/Month"
description: "How we host 30+ plugins, a website, CI/CD, and a community without spending a dollar on infrastructure."
date: 2026-03-01
author: "Open WP Club"
tags: ["tech-stack", "open-source", "infrastructure"]
---

People are often surprised when we mention that Open WP Club's entire infrastructure costs $0 per month. Here's how we do it - and how you can do the same for your open-source project.

## Hosting

The website is built with [Astro](https://astro.build), a static site generator that outputs plain HTML, CSS, and minimal JavaScript, and it runs on **Cloudflare Workers**. We connected the GitHub repo directly in the Cloudflare dashboard, so every push to `main` triggers a build and deploy automatically - no separate CI pipeline to maintain, no deploy scripts to babysit.

Static sites are fast, secure, and essentially free to host. There's no server to patch, no database to back up, and no scaling to worry about.

## Code and CI/CD

Everything lives on **GitHub**, which is free for public repositories, including issues and project boards. The website's own build and deploy happens through Cloudflare's Git integration, but individual plugin repos use **GitHub Actions** for their release pipeline - packaging a zip and attaching it to a GitHub release whenever a version tag gets pushed. Public repos get generous free minutes for that.

## DNS and security

**Cloudflare** also handles our DNS and provides DDoS protection, SSL, and caching - all on the free tier.

## Community

**Discord** is free for community servers. **GitHub Discussions** handles long-form conversations. **GitHub Issues** manages bug reports and feature requests.

## What about plugin hosting?

Our plugins are hosted on GitHub (free) and submitted to the WordPress.org plugin directory (free). Downloads are served by WordPress.org's infrastructure or GitHub releases.

## The stack at a glance

| Service | Cost | Purpose |
|---------|------|---------|
| Cloudflare Workers | $0 | Website hosting + deploys |
| Cloudflare DNS | $0 | DNS + DDoS protection |
| GitHub | $0 | Code hosting, issues, plugin release CI |
| Discord | $0 | Community |
| WordPress.org | $0 | Plugin distribution |

**Total: $0/month.**

## Why it matters

We don't spend anything on infrastructure, so there's no premium tier and no ad slot needed to cover a hosting bill. The software stays free because running it costs us nothing to begin with.

If you're starting an open-source project, don't overthink the infrastructure. Start with free tools, keep it simple, and scale when you actually need to.

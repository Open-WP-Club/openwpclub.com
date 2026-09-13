---
title: "WordPress Plugin Check Is Now Running on Every Plugin We Maintain"
description: "We added WordPress.org's official Plugin Check tool to CI across all our plugin repos - here's why, and the standard we're holding ourselves to going forward."
date: 2026-09-13
author: "Open WP Club"
tags: ["security", "announcement", "ci-cd"]
---

We just added [Plugin Check](https://wordpress.org/plugins/plugin-check/) - WordPress.org's own plugin scanner - to the CI pipeline of every active plugin we maintain. Not one flagship repo, all of them.

## Why now

WordPress.org recently turned on [automated security review for plugin releases](https://make.wordpress.org/plugins/2026/09/09/automated-security-review-for-plugin-releases/): every update now sits in a cooldown window while AI models and Jetpack Scan check the diff before it reaches the update API. Plugin Check is the same check family the Plugin Review team recommends developers run themselves, proactively, instead of finding out about a problem after the fact.

That's the whole point for us. We'd rather catch something in our own CI, on our own schedule, than have it caught downstream.

## What it actually checks

Plugin Check runs three categories of checks on every push and pull request:

- **Security** - unsafe direct database queries, missing output escaping, unsafe redirects
- **Performance** - oversized enqueued scripts/styles, render-blocking assets, inefficient `WP_Query` params
- **General** - i18n usage, PHP error reporting left on in production code

We deliberately skip the "Plugin Repo" category. Those checks (readme.txt formatting, trademark usage, a ban on self-hosted updaters) exist for the wp.org SVN submission process - and our plugins ship through GitHub Releases, not the wp.org repo. Running them would just be noise.

## Where we're starting

Results are advisory for now, not blocking - we're not going to pretend 40+ repos are spotless the moment a new scanner turns on. We're going through them one at a time, as we touch each plugin for other work, and fixing what it finds as we go. No rushed mass-commit, no false "all green" badge.

## The standard going forward

Every new plugin gets this wired in from day one. Every existing one gets checked on every single push from now on. It's the same principle behind everything else here: free doesn't mean lower-effort, and open-source doesn't mean unaudited. We're just making that easier to verify than to take our word for.

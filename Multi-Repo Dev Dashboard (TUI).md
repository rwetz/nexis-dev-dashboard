---
type: project
status: idea         # idea → planning → building → shipped → archived
priority: high
started: 2026-07-09
tags:
  - project
  - domain/app
  - domain/devtools
stack: [rust, ratatui, git2]
repo:
---

# Multi-Repo Dev Dashboard (TUI)

> [!abstract] One-liner
> A terminal dashboard that shows git status — branch, dirty state, ahead/behind, last commit — across all 17 of my repos in one glance, instead of `cd`-ing into each one.

## 🎯 Problem & Motivation

- **Problem:** I have 17 repos scattered across this machine and no single view of which ones have uncommitted changes, unpushed commits, or are behind their remote. Right now that means manually `cd`-ing and running `git status` repo by repo, which I just... don't do, so things go stale.
- **Why me / why now:** This is a tool I would open every single day, which makes it the best kind of portfolio project — proof I ship things I actually use, not just résumé filler. It's also a genuine "systems/dev tools" project: terminal UI programming, concurrent filesystem/git scanning, and a real Rust codebase, which directly supports the "beyond just websites" goal and plays to Rust already being on my resume.
- **Who it's for:** Me, daily. Secondary audience: anyone else juggling many local repos who wants a `k9s`-style dashboard for git instead of GitHub Desktop or repeated CLI commands.

## ✅ Goals & Non-Goals

**Goals (what success looks like)**
- [ ] Launching the TUI shows all configured repos in a scrollable list with branch, dirty/clean, ahead/behind counts, and last commit message + relative time.
- [ ] Scanning 17 repos completes in well under a second (concurrent, not sequential) and refreshes on demand without restarting the app.
- [ ] Selecting a repo shows more detail (changed files, stash count) and can drop into a shell at that repo's path.

**Non-Goals (explicitly out of scope, at least for v1)**
- No git operations performed *from* the TUI (no commit/push/pull) — this is a read-only status dashboard for v1.
- No remote/cloud sync of repo list across machines — a local config file is enough.
- No support for non-git VCS.

## 🧩 Core Features (MVP)

1. **Repo discovery** — read a config file (or auto-scan a root directory) listing repo paths to track.
2. **Concurrent status scan** — for each repo, read branch, dirty/clean state, ahead/behind vs. upstream, and last commit via `git2` (libgit2 bindings), scanned in parallel.
3. **List view** — `ratatui` table/list showing all repos at a glance, color-coded (clean/dirty/ahead/behind).
4. **Detail view** — select a repo to see changed file list, stash count, and full last-commit info.
5. **Manual refresh + shell drop** — a keybind to re-scan on demand, and a keybind to exit into a shell `cd`'d into the selected repo.

## 🛠️ Tech Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Language | Rust | Already on my resume; TUI + concurrent filesystem work is a strong systems showcase |
| Backend / core | `git2` (libgit2 bindings), `tokio` or `rayon` for concurrent scanning | Avoids shelling out to `git` for every repo — direct, fast |
| Frontend | `ratatui` + `crossterm` | Standard modern Rust TUI stack |
| Storage | Local `config.toml` (repo paths/list) | No DB needed |
| Hosting | N/A — local CLI tool | Distributed as a compiled binary, maybe via `cargo install` from the repo |
| Key libraries / APIs | `git2`, `ratatui`, `crossterm`, `rayon` or `tokio` | `rayon` is simplest for a one-shot parallel scan; `tokio` only needed if adding live file-watching later |

## 🗺️ Milestones

- [ ] **M1 — Walking skeleton**: `ratatui` app boots, renders a static list of hardcoded repo names in a terminal UI, quits cleanly on `q`.
- [ ] **M2 — Core loop**: `config.toml` drives the repo list; `git2` reads real status (branch, dirty, ahead/behind, last commit) for each, scanned concurrently, rendered in the list with color coding.
- [ ] **M3 — Polish / ship**: detail view (changed files, stash count), manual refresh keybind, shell-drop keybind, packaged as an installable binary with a real config pointing at all 17 repos.

## 🤖 Claude Code Brief

> [!note] Paste everything in this section into Claude Code to start building.
> This is the self-contained handoff — it should make sense without the rest of the note.

**Objective:** Build a Rust terminal dashboard (`ratatui`) that concurrently scans a configured list of local git repos and displays branch, dirty/clean state, ahead/behind counts, and last commit for each in a single scrollable view, with a detail pane and manual refresh.

**Stack & constraints:** Rust, `ratatui` + `crossterm` for the TUI, `git2` (libgit2 bindings — not shelling out to the `git` CLI) for repo status, `rayon` for parallel scanning across repos. Config lives in a local `config.toml` listing repo paths (or a root directory to auto-discover `.git` folders under). No git write operations in v1 — read-only.

**Build order (do these in sequence, verify each before moving on):**
1. Scaffold: Rust project, `ratatui` + `crossterm` boilerplate rendering a static "Hello, repos" screen, clean quit on `q`/`Ctrl-C`.
2. Config loading: define `config.toml` schema (`repos: ["/path/a", "/path/b", ...]` or `scan_root: "/path"`), parse with `serde` + `toml`, fall back to auto-discovering `.git` dirs under a root if no explicit list given.
3. Git status core: for a single repo path, use `git2` to open the repo and extract current branch name, dirty/clean (any uncommitted changes), ahead/behind counts vs. upstream, and the last commit's message + author-relative-time. Write this as a standalone function first and test it against a couple of real local repos.
4. Concurrent scan: run that status function across all configured repos in parallel with `rayon`, collect results into a `Vec<RepoStatus>`, verify wall-clock time for 17 repos is well under a second.
5. List view: render `RepoStatus` rows in a `ratatui` table/list widget — repo name, branch, dirty indicator, ahead/behind, last commit summary — color-coded (e.g. green=clean, yellow=dirty, red=diverged).
6. Detail view: arrow-key navigation to select a row, `Enter` (or a split pane) shows changed file list and stash count for that repo, pulled via `git2`.
7. Interactions: `r` to re-scan on demand (re-run step 4 without restarting the app), and a keybind to exit the TUI and drop the user into a shell already `cd`'d into the selected repo's path (spawn `$SHELL` with the working directory set).
8. Package: build a release binary, confirm `cargo install --path .` works, point the real config at all 17 of my repos and verify the dashboard renders correctly for each.

**Definition of done for v1:** Running the binary shows a live-scanned status table for all 17 configured repos (branch, dirty state, ahead/behind, last commit) in under a second, supports selecting a repo for a detail view, refreshing on demand, and dropping into a shell at the selected repo's path.

**Open questions for me to answer:** Do I want an explicit repo list in `config.toml`, or auto-discovery by scanning a root directory (e.g. `~/Projects` or `~/code`) for `.git` folders — or both, with explicit list taking precedence? Any preference on the color scheme / keybindings (vim-style `j`/`k` vs. arrow keys)? Should the "last commit" shown be for the current branch only, or also flag if `main`/`master` has moved ahead upstream?

## 📓 Log & Decisions

- `2026-07-09` — Promoted from [[Idea Backlog]]. Chose `git2` (libgit2) over shelling out to the `git` CLI for reliability and speed under concurrent scanning; chose `rayon` over `tokio` since scanning is CPU/IO-bound and one-shot per refresh, not a long-lived async event loop.

## 🔗 Related

- [[Idea Backlog]]
- [[Project Types Catalog]]
- [[Home]]
- [[Personal API Aggregator]] — a natural data source for a future "activity" panel in this dashboard

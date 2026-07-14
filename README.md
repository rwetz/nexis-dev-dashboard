# Dev Dashboard

A desktop dashboard that shows git status — branch, dirty state, ahead/behind,
stashes, last commit — across **all your local repos in one glance**, instead of
`cd`-ing into each one. Built in the [Nexis](https://github.com/rwetz/Nexis)
design family (Tauri v2 + React 19), with the git scanning done natively in
Rust via `git2` + `rayon` (17 repos scan in ~20 ms).

## Features

- **Concurrent status scan** — every configured repo is read in parallel with
  libgit2 (no shelling out): branch, staged/unstaged/untracked/conflicted
  counts, ahead/behind vs. upstream, stash count, last commit + relative time.
- **Color-coded list view** — green = clean, amber = dirty, blue/orange =
  ahead/behind, red = diverged/conflict/error.
- **Detail pane** — select a repo for its changed-file list (git short-status
  codes), stashes, and full last-commit info.
- **Shell drop** — `t` opens your terminal (`$TERMINAL`, then common
  emulators) at the selected repo; `o` opens the folder.
- **Manual refresh** — `r` or the header button re-scans without restarting;
  config edits are picked up on every scan.
- Nexis design system: borderless custom chrome (Linux/Windows), bespoke
  cursor set, OKLCH themes with light/dark + View-Transition crossfade.

## Keybindings

| Key | Action |
| --- | --- |
| `j` / `k` / arrows | Move selection |
| `Enter` | Toggle detail pane |
| `Esc` | Close detail pane |
| `r` | Re-scan all repos |
| `t` | Open terminal at selected repo |
| `o` | Open selected repo folder |

## Configuration

`~/.config/nexis-dev-dashboard/config.toml` (created on first run — the ⚙
button in the status bar opens it):

```toml
# Explicit repos to track (tilde is expanded). Always included.
repos = ["~/work/some-repo"]

# Auto-discover git repos under this root, up to scan_depth levels deep.
scan_root = "~/dev"
scan_depth = 3
```

Both knobs are honored and deduplicated; explicit entries are listed first.

## Development

```bash
pnpm install
pnpm tauri dev            # run with HMR
pnpm tauri build          # produce installers (deb/rpm/…)
cd src-tauri && cargo test              # backend tests
cd src-tauri && cargo run --example scan  # CLI scan smoke test + timing
```

The design language lives in [`_design/`](_design/README.md) — extracted from
Nexis, the reference implementation.

> Linux/NVIDIA note: WebKitGTK's DMA-BUF renderer crashes on NVIDIA + Wayland,
> and the usual env-var workaround breaks window transparency. When an NVIDIA
> driver is detected the app forces Mesa's EGL (llvmpipe) instead — stable and
> alpha-correct. Set `DEVDASH_KEEP_HW_ACCEL=1` to opt back into hardware GL
> (e.g. after a webkit/driver fix). The theme crossfade is a hard cut on Linux
> (WebKitGTK's View Transitions crash); full details in `_design/PITFALLS.md`.

//! CLI smoke test for the scan pipeline: `cargo run --example scan`
//! Loads (or creates) the real config, discovers repos, scans them in
//! parallel, and prints a status table + wall-clock timing.

use nexis_dev_dashboard_lib::{config, gitscan};
use rayon::prelude::*;

fn main() {
    let (cfg, path) = config::load_or_init().expect("config loads");
    println!("config: {}", path.display());
    println!("scan_root: {:?} (depth {})\n", cfg.scan_root, cfg.scan_depth);

    let started = std::time::Instant::now();
    let paths = config::resolve_repos(&cfg);
    let discover_ms = started.elapsed().as_millis();

    let scan_started = std::time::Instant::now();
    let mut repos: Vec<_> = paths.par_iter().map(|p| gitscan::scan_repo(p)).collect();
    repos.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    let scan_ms = scan_started.elapsed().as_millis();

    for r in &repos {
        let sync = match (&r.upstream, r.ahead, r.behind) {
            (None, _, _) => "no-remote".to_string(),
            (_, 0, 0) => "synced".to_string(),
            (_, a, b) => format!("↑{a} ↓{b}"),
        };
        let dirt = format!(
            "{}S {}M {}? {}!",
            r.staged, r.unstaged, r.untracked, r.conflicted
        );
        let commit = r
            .last_commit
            .as_ref()
            .map(|c| format!("{} — {}", c.hash, c.summary))
            .unwrap_or_else(|| "no commits".into());
        let err = r.error.as_deref().unwrap_or("");
        println!(
            "{:<28} {:<22} {:<10} {:<14} stash:{} {} {}",
            r.name, r.branch, sync, dirt, r.stash_count, commit, err
        );
    }
    println!(
        "\n{} repos · discovery {} ms · scan {} ms",
        repos.len(),
        discover_ms,
        scan_ms
    );
}

//! Read-only git status extraction via git2 (libgit2) — no shelling out.
//! `scan_repo` is self-contained per repo so rayon can fan the whole list out.

use git2::{BranchType, ErrorCode, Repository, Status, StatusOptions};
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Default)]
pub struct CommitInfo {
    pub summary: String,
    pub author: String,
    /// Unix seconds — the frontend renders relative time.
    pub time: i64,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct RepoStatus {
    pub path: String,
    pub name: String,
    pub branch: String,
    pub detached: bool,
    pub staged: usize,
    pub unstaged: usize,
    pub untracked: usize,
    pub conflicted: usize,
    pub ahead: usize,
    pub behind: usize,
    pub upstream: Option<String>,
    pub stash_count: usize,
    pub last_commit: Option<CommitInfo>,
    pub error: Option<String>,
}

impl RepoStatus {
    #[allow(dead_code)] // exercised in tests; the frontend has its own isDirty
    pub fn dirty(&self) -> bool {
        self.staged + self.unstaged + self.untracked + self.conflicted > 0
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct FileChange {
    pub path: String,
    /// Single-letter code for the index side (staged): A M D R T
    pub index: Option<String>,
    /// Single-letter code for the worktree side: M D T ? (untracked)
    pub worktree: Option<String>,
    pub conflicted: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct RepoDetail {
    pub status: RepoStatus,
    pub files: Vec<FileChange>,
    pub stashes: Vec<String>,
}

pub fn scan_repo(path: &Path) -> RepoStatus {
    let mut st = RepoStatus {
        path: path.display().to_string(),
        name: path
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_else(|| path.display().to_string()),
        ..Default::default()
    };
    if let Err(e) = fill_status(path, &mut st) {
        st.error = Some(e.message().to_string());
    }
    st
}

fn fill_status(path: &Path, st: &mut RepoStatus) -> Result<(), git2::Error> {
    let mut repo = Repository::open(path)?;

    match repo.head() {
        Ok(head) => {
            if repo.head_detached().unwrap_or(false) {
                st.detached = true;
                st.branch = head
                    .peel_to_commit()
                    .map(|c| c.id().to_string()[..7].to_string())
                    .unwrap_or_else(|_| "HEAD".into());
            } else {
                st.branch = head.shorthand().unwrap_or("HEAD").to_string();
            }
            if let Ok(commit) = head.peel_to_commit() {
                st.last_commit = Some(CommitInfo {
                    summary: commit.summary().unwrap_or("").to_string(),
                    author: commit.author().name().unwrap_or("").to_string(),
                    time: commit.time().seconds(),
                    hash: commit.id().to_string()[..7].to_string(),
                });
            }
        }
        // Freshly-initialized repo with no commits: HEAD points at an unborn
        // branch — surface its name instead of erroring out.
        Err(e) if e.code() == ErrorCode::UnbornBranch => {
            if let Ok(head_ref) = repo.find_reference("HEAD") {
                if let Some(target) = head_ref.symbolic_target() {
                    st.branch = target
                        .strip_prefix("refs/heads/")
                        .unwrap_or(target)
                        .to_string();
                }
            }
        }
        Err(e) => return Err(e),
    }

    let mut opts = StatusOptions::new();
    opts.include_untracked(true).exclude_submodules(true);
    let statuses = repo.statuses(Some(&mut opts))?;
    for entry in statuses.iter() {
        count_status(entry.status(), st);
    }
    // `statuses` borrows `repo`; stash_foreach below needs `&mut repo`.
    drop(statuses);

    if !st.detached && !st.branch.is_empty() {
        if let Ok(local) = repo.find_branch(&st.branch, BranchType::Local) {
            if let Ok(up) = local.upstream() {
                if let Ok(Some(name)) = up.name() {
                    st.upstream = Some(name.to_string());
                }
                if let (Some(l), Some(u)) = (local.get().target(), up.get().target()) {
                    if let Ok((ahead, behind)) = repo.graph_ahead_behind(l, u) {
                        st.ahead = ahead;
                        st.behind = behind;
                    }
                }
            }
        }
    }

    let mut stash_count = 0usize;
    let _ = repo.stash_foreach(|_, _, _| {
        stash_count += 1;
        true
    });
    st.stash_count = stash_count;

    Ok(())
}

fn count_status(s: Status, st: &mut RepoStatus) {
    if s.is_conflicted() {
        st.conflicted += 1;
        return;
    }
    if s.is_wt_new() {
        st.untracked += 1;
    }
    if s.is_index_new()
        || s.is_index_modified()
        || s.is_index_deleted()
        || s.is_index_renamed()
        || s.is_index_typechange()
    {
        st.staged += 1;
    }
    if s.is_wt_modified() || s.is_wt_deleted() || s.is_wt_renamed() || s.is_wt_typechange() {
        st.unstaged += 1;
    }
}

pub fn repo_detail(path: &Path) -> Result<RepoDetail, String> {
    let status = scan_repo(path);
    if let Some(err) = &status.error {
        return Err(err.clone());
    }

    let mut repo = Repository::open(path).map_err(|e| e.message().to_string())?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .exclude_submodules(true);
    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| e.message().to_string())?;

    let mut files: Vec<FileChange> = Vec::with_capacity(statuses.len());
    for entry in statuses.iter() {
        let s = entry.status();
        let path = entry.path().unwrap_or("<invalid utf-8>").to_string();
        let index = index_code(s);
        let worktree = worktree_code(s);
        let conflicted = s.is_conflicted();
        if index.is_none() && worktree.is_none() && !conflicted {
            continue; // ignored/clean entries
        }
        files.push(FileChange { path, index, worktree, conflicted });
    }
    files.sort_by(|a, b| a.path.cmp(&b.path));
    // `statuses` borrows `repo`; stash_foreach below needs `&mut repo`.
    drop(statuses);

    let mut stashes: Vec<String> = Vec::new();
    let _ = repo.stash_foreach(|_, msg, _| {
        stashes.push(msg.to_string());
        true
    });

    Ok(RepoDetail { status, files, stashes })
}

fn index_code(s: Status) -> Option<String> {
    let c = if s.is_index_new() {
        'A'
    } else if s.is_index_modified() {
        'M'
    } else if s.is_index_deleted() {
        'D'
    } else if s.is_index_renamed() {
        'R'
    } else if s.is_index_typechange() {
        'T'
    } else {
        return None;
    };
    Some(c.to_string())
}

fn worktree_code(s: Status) -> Option<String> {
    let c = if s.is_wt_new() {
        '?'
    } else if s.is_wt_modified() {
        'M'
    } else if s.is_wt_deleted() {
        'D'
    } else if s.is_wt_renamed() {
        'R'
    } else if s.is_wt_typechange() {
        'T'
    } else {
        return None;
    };
    Some(c.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Command;

    fn git(dir: &Path, args: &[&str]) {
        let out = Command::new("git")
            .args(args)
            .current_dir(dir)
            .env("GIT_AUTHOR_NAME", "t")
            .env("GIT_AUTHOR_EMAIL", "t@t")
            .env("GIT_COMMITTER_NAME", "t")
            .env("GIT_COMMITTER_EMAIL", "t@t")
            .output()
            .expect("git runs");
        assert!(out.status.success(), "git {args:?}: {}", String::from_utf8_lossy(&out.stderr));
    }

    #[test]
    fn scans_a_fresh_repo_with_commit_and_dirt() {
        let tmp = std::env::temp_dir().join(format!("devdash-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).unwrap();
        git(&tmp, &["init", "-b", "main"]);
        std::fs::write(tmp.join("a.txt"), "hello").unwrap();
        git(&tmp, &["add", "a.txt"]);
        git(&tmp, &["commit", "-m", "first commit"]);
        std::fs::write(tmp.join("b.txt"), "untracked").unwrap();
        std::fs::write(tmp.join("a.txt"), "changed").unwrap();

        let st = scan_repo(&tmp);
        assert_eq!(st.error, None);
        assert_eq!(st.branch, "main");
        assert_eq!(st.untracked, 1);
        assert_eq!(st.unstaged, 1);
        assert!(st.dirty());
        let commit = st.last_commit.expect("has last commit");
        assert_eq!(commit.summary, "first commit");

        let detail = repo_detail(&tmp).expect("detail ok");
        assert_eq!(detail.files.len(), 2);

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn reports_error_for_non_repo() {
        let tmp = std::env::temp_dir().join(format!("devdash-nonrepo-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).unwrap();
        let st = scan_repo(&tmp);
        assert!(st.error.is_some());
        let _ = std::fs::remove_dir_all(&tmp);
    }
}

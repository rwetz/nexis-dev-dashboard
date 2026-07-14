// Mirrors the serde-serialized structs in src-tauri/src/gitscan.rs.

export type CommitInfo = {
  summary: string;
  author: string;
  /** unix seconds */
  time: number;
  hash: string;
};

export type RepoStatus = {
  path: string;
  name: string;
  branch: string;
  detached: boolean;
  staged: number;
  unstaged: number;
  untracked: number;
  conflicted: number;
  ahead: number;
  behind: number;
  upstream: string | null;
  stash_count: number;
  last_commit: CommitInfo | null;
  error: string | null;
};

export type FileChange = {
  path: string;
  index: string | null;
  worktree: string | null;
  conflicted: boolean;
};

export type RepoDetail = {
  status: RepoStatus;
  files: FileChange[];
  stashes: string[];
};

export type ScanResult = {
  repos: RepoStatus[];
  elapsed_ms: number;
  config_path: string;
  scan_root: string | null;
};

export function isDirty(r: RepoStatus): boolean {
  return r.staged + r.unstaged + r.untracked + r.conflicted > 0;
}

export type RepoState =
  | "error"
  | "conflict"
  | "dirty"
  | "diverged"
  | "behind"
  | "ahead"
  | "clean";

export function repoState(r: RepoStatus): RepoState {
  if (r.error) return "error";
  if (r.conflicted > 0) return "conflict";
  if (isDirty(r)) return "dirty";
  if (r.ahead > 0 && r.behind > 0) return "diverged";
  if (r.behind > 0) return "behind";
  if (r.ahead > 0) return "ahead";
  return "clean";
}

export const STATE_META: Record<
  RepoState,
  { label: string; dot: string; text: string }
> = {
  clean:    { label: "clean",    dot: "bg-emerald-500",  text: "text-emerald-500" },
  dirty:    { label: "dirty",    dot: "bg-amber-400",    text: "text-amber-400" },
  ahead:    { label: "ahead",    dot: "bg-sky-400",      text: "text-sky-400" },
  behind:   { label: "behind",   dot: "bg-orange-400",   text: "text-orange-400" },
  diverged: { label: "diverged", dot: "bg-red-400",      text: "text-red-400" },
  conflict: { label: "conflict", dot: "bg-destructive",  text: "text-destructive" },
  error:    { label: "error",    dot: "bg-destructive",  text: "text-destructive" },
};

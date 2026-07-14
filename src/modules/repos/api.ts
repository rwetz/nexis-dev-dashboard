import { invoke } from "@tauri-apps/api/core";
import type { RepoDetail, ScanResult } from "./types";

export function scanRepos(): Promise<ScanResult> {
  return invoke<ScanResult>("scan_repos");
}

export function fetchRepoDetail(path: string): Promise<RepoDetail> {
  return invoke<RepoDetail>("repo_detail", { path });
}

/** Resolves to the terminal binary that was launched. */
export function openInTerminal(path: string): Promise<string> {
  return invoke<string>("open_in_terminal", { path });
}

export function openPath(path: string): Promise<void> {
  return invoke<void>("open_path", { path });
}

export function openConfig(): Promise<void> {
  return invoke<void>("open_config");
}

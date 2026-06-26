// Browser file-download helper (Phase 6 / D-11).
//
// Triggers a file download via a Blob + temporary anchor click. Used by the
// SettingsPanel export buttons (JSON + CSV). Centralized so both buttons share it.

export function triggerDownload(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

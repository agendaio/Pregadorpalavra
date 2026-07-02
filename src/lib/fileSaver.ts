/**
 * fileSaver — wrapper mínimo sobre a API File System Access (com fallback).
 *
 * Em browsers modernos (Chrome 86+, Edge 86+), abre o save picker nativo.
 * Em outros, usa <a download> como fallback.
 */

interface FileSystemWritableFileStreamLike {
  write: (b: Blob) => Promise<void>;
  close: () => Promise<void>;
}

export function saveAs(blob: Blob, filename: string): void {
  // Caminho moderno: File System Access API
  interface SaveFilePickerWindow {
    showSaveFilePicker?: (opts?: unknown) => Promise<{
      createWritable: () => Promise<FileSystemWritableFileStreamLike>;
    }>;
  }
  const w = window as unknown as SaveFilePickerWindow;
  if (typeof w.showSaveFilePicker === 'function') {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      md: 'text/markdown',
      txt: 'text/plain',
    };
    w.showSaveFilePicker({
      suggestedName: filename,
      types: [{
        description: filename,
        accept: { [mimeMap[ext] ?? blob.type ?? 'application/octet-stream']: ['.' + ext] },
      }],
    })
      .then((handle) => handle.createWritable())
      .then((writable: FileSystemWritableFileStreamLike) => writable.write(blob).then(() => writable.close()))
      .catch(() => fallback());
    return;
  }
  fallback();

  function fallback() {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

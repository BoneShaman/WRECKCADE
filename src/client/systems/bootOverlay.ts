import type * as Phaser from 'phaser';

let overlayGeneration = 0;

function clampProgress(progress: number): number {
  return Math.max(0.07, Math.min(1, progress));
}

function overlay(): HTMLElement | null {
  return document.getElementById('boot-loader');
}

export function showBootOverlay(message: string, progress = 0.07): number {
  overlayGeneration += 1;
  const element = overlay();
  if (!element) return overlayGeneration;

  const messageElement = document.getElementById('boot-message');
  if (messageElement) messageElement.textContent = message;
  element.style.setProperty(
    '--boot-progress',
    `${Math.round(clampProgress(progress) * 100)}%`
  );
  element.classList.remove('is-hidden');
  element.setAttribute('aria-busy', 'true');
  return overlayGeneration;
}

export function setBootOverlayProgress(progress: number): void {
  overlay()?.style.setProperty(
    '--boot-progress',
    `${Math.round(clampProgress(progress) * 100)}%`
  );
}

export function bindBootOverlayToLoader(
  loader: Phaser.Loader.LoaderPlugin,
  message: string
): void {
  const generation = showBootOverlay(message);
  const onProgress = (progress: number): void => {
    if (generation !== overlayGeneration) return;
    setBootOverlayProgress(progress);
  };
  loader.on('progress', onProgress);
  loader.once('complete', () => {
    loader.off('progress', onProgress);
    if (generation === overlayGeneration) setBootOverlayProgress(1);
  });
}

export function hideBootOverlayAfterPaint(): void {
  const generation = overlayGeneration;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (generation !== overlayGeneration) return;
      const element = overlay();
      element?.classList.add('is-hidden');
      element?.setAttribute('aria-busy', 'false');
    });
  });
}

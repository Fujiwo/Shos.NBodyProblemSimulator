// Measures canvas display and buffer dimensions and writes the responsive app-height CSS variable.

export function measureViewportDisplaySize(canvasElement) {
  const bounds = canvasElement.getBoundingClientRect();

  return {
    width: Math.max(1, Math.floor(bounds.width)),
    height: Math.max(1, Math.floor(bounds.height))
  };
}

export function measureCanvasBufferSize(canvasElement, pixelRatio) {
  const displaySize = measureViewportDisplaySize(canvasElement);

  return {
    width: Math.max(1, Math.floor(displaySize.width * pixelRatio)),
    height: Math.max(1, Math.floor(displaySize.height * pixelRatio))
  };
}

export function applyViewportHeight(documentRoot, viewportHeight) {
  documentRoot.style.setProperty("--app-height", `${viewportHeight}px`);
}
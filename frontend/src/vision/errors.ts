export const describeVisionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/play\(\) request was interrupted by a new load request/i.test(message)) return 'Camera startup was interrupted while the video stream was loading. Retry the camera check; your browser did not deny permission.';
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'Camera permission was blocked. Allow camera access for this site,.';
    if (error.name === 'NotFoundError') return 'No camera was found. Connect a camera, retry,.';
    if (error.name === 'NotReadableError') return 'The camera is busy in another app. Close that app and retry.';
    if (error.name === 'AbortError') return 'Camera startup was interrupted. Retry the camera check.';
  }
  if (error instanceof Error && error.message) return `Face tracking could not start: ${error.message}`;
  return 'Camera or face tracking could not start. Check the browser permission and network/model settings, then retry.';
};

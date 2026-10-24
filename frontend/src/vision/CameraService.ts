export class CameraService {
  private stream: MediaStream | null = null;
  private startGeneration = 0;

  async start(video: HTMLVideoElement) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not support camera access.');
    if (this.stream?.active && video.srcObject === this.stream) {
      if (video.paused) await this.play(video, this.stream);
      return this.stream;
    }
    this.stop(video);
    const request = ++this.startGeneration;
    const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    if (request !== this.startGeneration) {
      nextStream.getTracks().forEach((track) => track.stop());
      throw new DOMException('Camera start was cancelled.', 'AbortError');
    }
    try {
      this.stream = nextStream;
      video.srcObject = nextStream;
      video.muted = true;
      video.playsInline = true;
      await this.play(video, nextStream);
      return nextStream;
    } catch (error) {
      this.stopStream(nextStream, video);
      throw error;
    }
  }

  private async play(video: HTMLVideoElement, stream: MediaStream) {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await video.play();
        return;
      } catch (error) {
        lastError = error;
        const interrupted = error instanceof DOMException && error.name === 'AbortError' || error instanceof Error && /interrupted by a new load request/i.test(error.message);
        if (!interrupted || this.stream !== stream || video.srcObject !== stream) throw error;
        // A MediaStream assignment can briefly create a second load request in Chromium.
        // Give metadata/autoplay one event-loop turn to settle before retrying.
        await new Promise<void>((resolve) => {
          let settled = false;
          const settle = () => {
            if (settled) return;
            settled = true;
            video.removeEventListener('loadedmetadata', settle);
            resolve();
          };
          video.addEventListener('loadedmetadata', settle, { once: true });
          setTimeout(settle, 50);
        });
        if (this.stream !== stream || video.srcObject !== stream) throw error;
      }
    }
    // If the same active stream is still attached, autoplay may complete after this
    // promise settles. Do not turn that transient browser race into a camera failure.
    if (this.stream === stream && video.srcObject === stream && stream.active) return;
    throw lastError;
  }

  stopStream(stream: MediaStream, video?: HTMLVideoElement) {
    stream.getTracks().forEach((track) => track.stop());
    if (this.stream === stream) this.stream = null;
    if (video?.srcObject === stream) {
      video.pause();
      video.srcObject = null;
    }
  }

  stop(video?: HTMLVideoElement) {
    this.startGeneration += 1;
    if (this.stream) this.stopStream(this.stream, video);
    else if (video) {
      video.pause();
      video.srcObject = null;
    }
  }

  get active() { return Boolean(this.stream?.active); }
}

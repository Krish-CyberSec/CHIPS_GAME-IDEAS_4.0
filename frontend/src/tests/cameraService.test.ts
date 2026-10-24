import { describe, expect, it, vi } from 'vitest';
import { CameraService } from '../vision/CameraService';

const makeStream = () => ({ active: true, getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream;

describe('camera lifecycle', () => {
  it('retries a browser play interruption while the same stream is still attached', async () => {
    const stream = makeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    const video = document.createElement('video');
    const play = vi.fn()
      .mockRejectedValueOnce(new DOMException('The play() request was interrupted by a new load request.', 'AbortError'))
      .mockResolvedValue(undefined);
    Object.defineProperty(video, 'play', { configurable: true, value: play });
    const service = new CameraService();

    await expect(service.start(video)).resolves.toBe(stream);
    expect(play).toHaveBeenCalledTimes(2);
    expect(video.srcObject).toBe(stream);
    service.stop(video);
  });
});

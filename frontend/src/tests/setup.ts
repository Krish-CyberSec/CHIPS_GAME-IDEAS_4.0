import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false }),
});
Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: () => Promise.resolve() });
Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: () => undefined });

// Web Audio API mock for Vitest / JSDOM
class MockAudioParam {
  value = 0;
  setValueAtTime(_val: number, _time: number) { return this; }
  exponentialRampToValueAtTime(_val: number, _time: number) { return this; }
  linearRampToValueAtTime(_val: number, _time: number) { return this; }
}

class MockGainNode {
  gain = new MockAudioParam();
  connect(_target: unknown) { return _target; }
  disconnect() {}
}

class MockOscillatorNode {
  type = 'sine';
  frequency = new MockAudioParam();
  connect(_target: unknown) { return _target; }
  disconnect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = {};
  createGain() { return new MockGainNode(); }
  createOscillator() { return new MockOscillatorNode(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

// @ts-expect-error Mocking AudioContext
window.AudioContext = MockAudioContext;
// @ts-expect-error Mocking webkitAudioContext
window.webkitAudioContext = MockAudioContext;


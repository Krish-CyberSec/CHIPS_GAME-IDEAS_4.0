import Phaser from 'phaser';
import type { ChipKind, GameConfiguration, GameResult, MouthTrackingState, PowerUpKind } from '../types';
import { calculateAccuracy, calculateObjectPoints, calculateXp, CHIP_POINTS, getComboMultiplier } from './scoring';
import { getCaptureZone, normalizedToGamePoint, overlapsCaptureZone } from './geometry';
import { gameAudio } from '../services/audio';
import { getDifficultyProfile, getLevelForScore } from './difficulty';

export interface GameInputProvider { getState: () => MouthTrackingState; }
export interface GameEngineCallbacks { onHud: (hud: GameHud) => void; onTracking: (tracking: boolean) => void; onFinish: (result: GameResult) => void; }
export interface GameHud { score: number; combo: number; multiplier: number; timeLeft: number; level: number; levelStartScore: number; nextLevelScore: number; captured: number; golden: number; bombs: number; missed: number; activePowerUps: { kind: PowerUpKind; remainingMs: number }[]; status: 'countdown' | 'playing' | 'paused' | 'tracking-lost' | 'completed'; levelUpAnnouncement?: { level: number; timestamp: number } | null; }

interface FallingObject { sprite: Phaser.GameObjects.Container; kind: ChipKind | 'powerup'; powerUp?: PowerUpKind; x: number; y: number; anchorX: number; speed: number; radius: number; processed: boolean; rotation: number; drift: number; wobbleAmplitude: number; wobblePhase: number; wobbleSpeed: number; }

const colors: Record<string, number> = { normal: 0xffc45c, golden: 0xffe078, speed: 0x50e3ff, frozen: 0xb9efff, combo: 0x9b7bff, bomb: 0xf8f7ff, mystery: 0xbafc65, magnet: 0x50e3ff, shield: 0xffd166, 'double-score': 0xff7b7b, 'slow-motion': 0xb9efff, 'extra-time': 0x9b7bff };
const labels: Record<string, string> = { normal: '', golden: 'BONUS', speed: '2X', frozen: 'ICE', combo: 'COMBO', bomb: '', mystery: '?', magnet: 'M', shield: 'S', 'double-score': '2X', 'slow-motion': 'SLOW', 'extra-time': '+5' };
const CHIP_TEXTURE = 'cbc-chip';
const GOLDEN_CHIP_TEXTURE = 'cbc-chip-golden';
const BOMB_TEXTURE = 'cbc-bomb';
const CAPTURE_COOLDOWN_MS = 140;

class BiteScene extends Phaser.Scene {
  private readonly inputProvider: GameInputProvider;
  private readonly callbacks: GameEngineCallbacks;
  private readonly config: GameConfiguration;
  private readonly nickname: string;
  private objects: FallingObject[] = [];
  private catcher!: Phaser.GameObjects.Graphics;
  private elapsed = 0;
  private spawnElapsed = 0;
  private countdown = 3;
  private countdownElapsed = 0;
  private score = 0;
  private combo = 0;
  private bestCombo = 0;
  private captured = 0;
  private golden = 0;
  private bombs = 0;
  private eligible = 0;
  private level = 1;
  private highestLevelReached = 1;
  private levelUpAnnouncement: { level: number; timestamp: number } | null = null;
  private paused = false;
  private completed = false;
  private activePowerUps = new Map<PowerUpKind, { activatedAt: number; remainingMs: number }>();
  private shieldAvailable = false;
  private speedCaptureCount = 0;
  private missed = 0;
  private finalTimeSeconds: number;
  private lastCaptureAt = -Infinity;
  private biteReady = true;
  private difficulty!: ReturnType<typeof getDifficultyProfile>;

  constructor(config: { inputProvider: GameInputProvider; callbacks: GameEngineCallbacks; gameConfig: GameConfiguration; nickname: string }) {
    super('BiteScene');
    this.inputProvider = config.inputProvider;
    this.callbacks = config.callbacks;
    this.config = config.gameConfig;
    this.nickname = config.nickname;
    this.finalTimeSeconds = config.gameConfig.roundDurationSeconds;
    this.difficulty = getDifficultyProfile(this.level, this.config);
  }

  create() {
    this.cameras.main.setBackgroundColor('#090817');
    this.ensureTextures();
    const width = this.scale.width;
    const height = this.scale.height;
    this.add.rectangle(width / 2, height / 2, width, height, 0x090817).setDepth(-2);
    for (let x = 0; x <= width; x += 48) this.add.line(0, 0, x, 0, x, height, 0x50e3ff, 0.06).setOrigin(0).setDepth(-1);
    for (let y = 0; y <= height; y += 48) this.add.line(0, 0, 0, y, width, y, 0x50e3ff, 0.06).setOrigin(0).setDepth(-1);
    this.catcher = this.add.graphics().setDepth(4);
    this.add.text(width / 2, height - 28, 'Open once when a chip enters the ring, then close for the next bite', { color: '#ffffff', fontFamily: 'DM Mono', fontSize: '12px' }).setOrigin(.5).setAlpha(.65).setDepth(10);
  }

  update(_time: number, delta: number) {
    if (this.completed) return;
    if (this.paused) { this.callbacks.onHud(this.hud('paused')); return; }
    if (this.countdown > 0) {
      this.countdownElapsed += delta;
      if (this.countdownElapsed >= 1000) { this.countdown -= 1; this.countdownElapsed = 0; if (this.countdown > 0) gameAudio.countdown(); }
      this.drawCatcher();
      this.callbacks.onHud(this.hud('countdown'));
      return;
    }

    const input = this.inputProvider.getState();
    if (!input.reliable) {
      // Tracking loss is a real gameplay pause: no timer, movement, spawn, or capture advances.
      this.callbacks.onTracking(false);
      this.drawCatcher(input);
      this.callbacks.onHud(this.hud('tracking-lost'));
      return;
    }

    this.callbacks.onTracking(true);
    this.elapsed += delta;
    const secondsLeft = Math.max(0, this.finalTimeSeconds - this.elapsed / 1000);
    const difficulty = this.syncLevel();
    if (secondsLeft <= 0) { this.finish(); return; }
    this.updatePowerUps(delta);
    this.spawnElapsed += delta;
    if (this.spawnElapsed >= difficulty.spawnRateMs) { this.spawnElapsed = 0; this.spawnObject(difficulty); }
    this.drawCatcher(input);
    this.updateObjects(delta, input);
    this.callbacks.onHud(this.hud('playing'));
  }

  setPaused(paused: boolean) { this.paused = paused; gameAudio.setPaused(paused); }
  togglePause() { this.setPaused(!this.paused); }
  stop() { this.finish(); }

  private ensureTextures() {
    if (!this.textures.exists(CHIP_TEXTURE)) {
      const graphics = this.add.graphics();
      const points = this.chipPoints();
      graphics.fillStyle(0xf2b84b, 1).fillPoints(points, true);
      graphics.lineStyle(2, 0x8e4f18, .72).strokePoints(points, true);
      graphics.fillStyle(0xfff1ae, .42).fillEllipse(34, 27, 25, 12);
      graphics.fillStyle(0xb66c22, .3).fillCircle(25, 50, 4).fillCircle(61, 33, 3).fillCircle(66, 54, 4);
      graphics.lineStyle(1, 0xd88b28, .4);
      graphics.beginPath(); graphics.moveTo(18, 30); graphics.lineTo(35, 37); graphics.lineTo(54, 28); graphics.strokePath();
      graphics.beginPath(); graphics.moveTo(31, 56); graphics.lineTo(48, 45); graphics.lineTo(75, 51); graphics.strokePath();
      graphics.generateTexture(CHIP_TEXTURE, 96, 80);
      graphics.clear();
      const goldenPoints = this.chipPoints(.9);
      graphics.fillStyle(0xffd45c, 1).fillPoints(goldenPoints, true);
      graphics.lineStyle(3, 0xfff1a2, .9).strokePoints(goldenPoints, true);
      graphics.fillStyle(0xffffff, .45).fillEllipse(34, 25, 28, 13);
      graphics.fillStyle(0xb66c22, .34).fillCircle(23, 49, 4).fillCircle(61, 34, 4).fillCircle(68, 53, 3);
      graphics.lineStyle(1, 0xfff3b2, .65);
      graphics.beginPath(); graphics.moveTo(19, 31); graphics.lineTo(36, 38); graphics.lineTo(55, 28); graphics.strokePath();
      graphics.generateTexture(GOLDEN_CHIP_TEXTURE, 96, 80);
      graphics.clear();
      graphics.fillStyle(0x18131b, 1).fillCircle(48, 44, 24);
      graphics.lineStyle(3, 0x090817, .95).strokeCircle(48, 44, 24);
      graphics.fillStyle(0x55515e, .52).fillCircle(40, 35, 8);
      graphics.lineStyle(4, 0xf5c76a, .9); graphics.beginPath(); graphics.moveTo(56, 23); graphics.lineTo(68, 11); graphics.lineTo(74, 18); graphics.strokePath();
      graphics.fillStyle(0xff7b7b, .95).fillCircle(75, 18, 4);
      graphics.generateTexture(BOMB_TEXTURE, 96, 80);
      graphics.destroy();
    }
  }

  private chipPoints(scale = 1) {
    const source = [[16, 31], [22, 18], [38, 14], [53, 17], [69, 13], [80, 25], [76, 40], [82, 53], [68, 65], [52, 62], [38, 70], [23, 62], [14, 49]];
    return source.map(([x, y]) => new Phaser.Geom.Point(48 + (x - 48) * scale, 40 + (y - 40) * scale));
  }

  private syncLevel() {
    const reachedLevel = getLevelForScore(this.score);
    if (reachedLevel > this.highestLevelReached) {
      this.highestLevelReached = reachedLevel;
      this.level = reachedLevel;
      this.triggerLevelUpEffect(reachedLevel);
      gameAudio.levelUp();
    }
    this.difficulty = getDifficultyProfile(this.level, this.config);
    return this.difficulty;
  }

  private triggerLevelUpEffect(newLevel: number) {
    const width = this.scale.width;
    const height = this.scale.height;
    this.levelUpAnnouncement = { level: newLevel, timestamp: performance.now() };

    const container = this.add.container(width / 2, height * 0.38).setDepth(20);
    const bannerBg = this.add.rectangle(0, 0, 360, 68, 0x090817, 0.9);
    bannerBg.setStrokeStyle(2, 0xffd166, 0.95);

    const titleText = this.add.text(0, -13, '★ LEVEL UP! ★', {
      color: '#ffe078',
      fontFamily: 'Podium Sharp, Impact, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subText = this.add.text(0, 13, `LEVEL ${newLevel} UNLOCKED`, {
      color: '#50e3ff',
      fontFamily: 'DM Mono, monospace',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const ring1 = this.add.circle(0, 0, 36, 0xffd166, 0).setStrokeStyle(4, 0xffd166, 1);
    const ring2 = this.add.circle(0, 0, 36, 0x50e3ff, 0).setStrokeStyle(3, 0x50e3ff, 0.8);

    container.add([bannerBg, titleText, subText, ring1, ring2]);
    container.setScale(0.3);
    container.setAlpha(0);

    this.tweens.add({ targets: ring1, radius: 130, alpha: 0, duration: 650, ease: 'Cubic.Out' });
    this.tweens.add({ targets: ring2, radius: 160, alpha: 0, duration: 800, ease: 'Cubic.Out' });
    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(1100, () => {
          this.tweens.add({
            targets: container,
            alpha: 0,
            y: height * 0.38 - 25,
            duration: 300,
            ease: 'Cubic.In',
            onComplete: () => {
              container.destroy();
            },
          });
        });
      },
    });
  }

  private spawnObject(difficulty = this.difficulty) {
    const width = this.scale.width;
    const x = Phaser.Math.Between(48, Math.max(48, width - 48));
    const roll = Math.random();
    let kind: ChipKind | 'powerup' = 'normal';
    let powerUp: PowerUpKind | undefined;
    const powerUpCutoff = .965;
    const bombCutoff = powerUpCutoff - difficulty.bombChance;
    if (roll > powerUpCutoff) { kind = 'powerup'; powerUp = (['magnet', 'shield', 'double-score', 'slow-motion', 'extra-time'] as PowerUpKind[])[Phaser.Math.Between(0, 4)]; }
    else if (roll > bombCutoff) kind = 'bomb';
    else if (roll > .84) kind = 'golden';
    else if (roll > .77) kind = this.level >= 3 ? 'mystery' : 'speed';
    else if (roll > .70) kind = 'frozen';
    else if (roll > .63) kind = 'combo';
    const label = labels[powerUp ?? kind];
    const color = colors[powerUp ?? kind];
    const radius = kind === 'powerup' ? 26 : kind === 'golden' ? 26 : kind === 'bomb' ? 25 : 24;
    const container = this.add.container(x, -radius, []).setDepth(5);
    const glow = this.add.circle(0, 0, radius + 9, color, kind === 'bomb' ? .08 : .13);
    const texture = kind === 'powerup' ? undefined : kind === 'bomb' ? BOMB_TEXTURE : kind === 'golden' ? GOLDEN_CHIP_TEXTURE : CHIP_TEXTURE;
    if (texture) {
      const chip = this.add.image(0, 0, texture).setDisplaySize(radius * 2.35, radius * 1.95);
      if (kind !== 'normal' && kind !== 'golden') chip.setTint(color);
      container.add(chip);
    } else {
      const orb = this.add.circle(0, 0, radius, color, 1).setStrokeStyle(3, 0xffffff, .6);
      container.add(orb);
    }
    if (label) container.add(this.add.text(0, 0, label, { color: '#090817', fontFamily: 'DM Mono', fontSize: kind === 'powerup' ? '8px' : kind === 'golden' ? '8px' : '9px', fontStyle: 'bold' }).setOrigin(.5));
    container.addAt(glow, 0);
    const rotation = Phaser.Math.FloatBetween(-.18, .18);
    container.rotation = rotation;
    this.objects.push({ sprite: container, kind, powerUp, x, y: -radius, anchorX: x, speed: Phaser.Math.Between(difficulty.minFallSpeed, difficulty.maxFallSpeed), radius, processed: false, rotation, drift: Phaser.Math.FloatBetween(-difficulty.lateralDrift, difficulty.lateralDrift), wobbleAmplitude: Phaser.Math.FloatBetween(0, difficulty.wobbleAmplitude), wobblePhase: Phaser.Math.FloatBetween(0, Math.PI * 2), wobbleSpeed: Phaser.Math.FloatBetween(.0012, .0024) });
  }

  private updateObjects(delta: number, input: MouthTrackingState) {
    const width = this.scale.width;
    const height = this.scale.height;
    const mouth = normalizedToGamePoint(input, width, height);
    const zone = getCaptureZone(input, width, height, true, this.difficulty.precisionPressure);
    const slow = this.activePowerUps.has('slow-motion') ? .42 : 1;
    const magnet = this.activePowerUps.has('magnet');
    const capturePressed = input.isOpen;
    const now = performance.now();
    if (!capturePressed) this.biteReady = true;

    for (const object of this.objects) {
      if (object.processed) continue;
      object.anchorX += object.drift * delta / 1000;
      if (object.anchorX < object.radius + 12 || object.anchorX > width - object.radius - 12) {
        object.anchorX = Phaser.Math.Clamp(object.anchorX, object.radius + 12, width - object.radius - 12);
        object.drift *= -1;
      }
      object.x = object.anchorX + Math.sin(this.elapsed * object.wobbleSpeed + object.wobblePhase) * object.wobbleAmplitude;
      if (magnet) object.x += (mouth.x - object.x) * Math.min(.08, delta / 1000);
      object.y += object.speed * slow * delta / 1000;
      object.rotation += delta / 900;
      object.sprite.x = object.x; object.sprite.y = object.y; object.sprite.rotation = object.rotation;
      if (capturePressed && this.biteReady && now - this.lastCaptureAt >= CAPTURE_COOLDOWN_MS && overlapsCaptureZone({ x: object.x, y: object.y }, object.radius, mouth, zone)) {
        this.lastCaptureAt = now;
        this.biteReady = false;
        this.capture(object);
      }
      if (object.y - object.radius > height + 10) {
        object.processed = true;
        if (object.kind !== 'powerup') {
          this.eligible += 1;
          this.missed += 1;
          if (object.kind !== 'bomb') {
            this.combo = 0;
            this.emitCaptureEffect(object.x, height - 28, 0xff7b7b, 'MISS');
          }
        }
        object.sprite.destroy();
      }
    }
    this.objects = this.objects.filter((object) => !object.processed);
    if (this.objects.length > 80) this.objects.slice(0, 20).forEach((object) => { object.processed = true; object.sprite.destroy(); });
  }

  private capture(object: FallingObject) {
    if (object.processed) return;
    object.processed = true;
    object.sprite.destroy();
    if (object.kind === 'powerup') {
      if (object.powerUp) { this.activatePowerUp(object.powerUp); this.emitCaptureEffect(object.x, object.y, colors[object.powerUp], labels[object.powerUp] || 'POWER'); gameAudio.powerup(); }
      return;
    }
    this.eligible += 1;
    if (object.kind === 'bomb') {
      this.emitCaptureEffect(object.x, object.y, colors.bomb, 'BOMB');
      if (this.shieldAvailable) { this.shieldAvailable = false; this.activePowerUps.delete('shield'); }
      else { this.score = Math.max(0, this.score - Math.abs(CHIP_POINTS.bomb)); this.bombs += 1; this.combo = 0; gameAudio.penalty(); }
      return;
    }
    this.captured += 1;
    this.combo += object.kind === 'combo' ? 2 : 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    if (object.kind === 'speed') this.activePowerUps.set('double-score', { activatedAt: performance.now(), remainingMs: 5000 });
    if (object.kind === 'frozen') this.activePowerUps.set('slow-motion', { activatedAt: performance.now(), remainingMs: 5000 });
    const multiplier = this.activePowerUps.has('double-score') ? 2 : 1;
    this.score += calculateObjectPoints(object.kind, this.combo, multiplier, this.config);
    this.syncLevel();
    if (object.kind === 'golden') this.golden += 1;
    if (this.activePowerUps.has('double-score')) this.speedCaptureCount += 1;
    const effectColor = object.kind === 'golden' ? colors.golden : colors[object.kind];
    this.emitCaptureEffect(object.x, object.y, effectColor, object.kind === 'golden' ? '+25' : `+${calculateObjectPoints(object.kind, this.combo, multiplier, this.config)}`);
    if (this.combo === 3 || this.combo === 5 || this.combo === 10) gameAudio.combo(); else if (object.kind === 'golden') gameAudio.golden(); else gameAudio.capture();
  }

  private emitCaptureEffect(x: number, y: number, color: number, text: string) {
    const ring = this.add.circle(x, y, 18, color, 0).setStrokeStyle(3, color, .9).setDepth(9);
    const feedback = this.add.text(x, y - 20, text, { color: `#${color.toString(16).padStart(6, '0')}`, fontFamily: 'DM Mono', fontSize: '12px', fontStyle: 'bold' }).setOrigin(.5).setDepth(10);
    this.tweens.add({ targets: ring, radius: 40, alpha: 0, duration: 260, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
    this.tweens.add({ targets: feedback, y: y - 48, alpha: 0, duration: 420, ease: 'Cubic.Out', onComplete: () => feedback.destroy() });
  }

  private activatePowerUp(kind: PowerUpKind) {
    if (kind === 'shield') { this.shieldAvailable = true; this.activePowerUps.set(kind, { activatedAt: performance.now(), remainingMs: 999999 }); return; }
    if (kind === 'extra-time') { this.finalTimeSeconds = Math.min(this.config.roundDurationSeconds + this.config.extraTimeCapSeconds, this.finalTimeSeconds + 5); return; }
    this.activePowerUps.set(kind, { activatedAt: performance.now(), remainingMs: 5000 });
  }

  private updatePowerUps(delta: number) {
    for (const [kind, value] of this.activePowerUps.entries()) {
      if (kind === 'shield') continue;
      value.remainingMs -= delta;
      if (value.remainingMs <= 0) this.activePowerUps.delete(kind);
    }
  }

  private drawCatcher(input = this.inputProvider.getState()) {
    const point = normalizedToGamePoint(input, this.scale.width, this.scale.height);
    const zone = getCaptureZone(input, this.scale.width, this.scale.height, true, this.difficulty.precisionPressure);
    this.catcher.clear();
    this.catcher.lineStyle(3, input.reliable ? 0x50e3ff : 0xff7b7b, .95);
    this.catcher.strokeEllipse(point.x, point.y, zone.radiusX * 2, zone.radiusY * 2);
    this.catcher.lineStyle(1, 0xffffff, .22); this.catcher.strokeEllipse(point.x, point.y, zone.radiusX * 2 + 26, zone.radiusY * 2 + 22);
    this.catcher.fillStyle(0x50e3ff, .08); this.catcher.fillEllipse(point.x, point.y, zone.radiusX * 2, zone.radiusY * 2);
  }

  private hud(status: GameHud['status']): GameHud {
    return { score: this.score, combo: this.combo, multiplier: getComboMultiplier(this.combo, this.config) * (this.activePowerUps.has('double-score') ? 2 : 1), timeLeft: Math.max(0, this.finalTimeSeconds - this.elapsed / 1000), level: this.level, levelStartScore: this.difficulty.levelStartScore, nextLevelScore: this.difficulty.nextLevelScore, captured: this.captured, golden: this.golden, bombs: this.bombs, missed: this.missed, activePowerUps: [...this.activePowerUps.entries()].filter(([, value]) => value.remainingMs < 999999).map(([kind, value]) => ({ kind, remainingMs: Math.max(0, value.remainingMs) })), status, levelUpAnnouncement: this.levelUpAnnouncement };
  }

  private finish() {
    if (this.completed) return;
    this.completed = true;
    this.objects.forEach((object) => object.sprite.destroy()); this.objects = [];
    gameAudio.complete();
    const result: GameResult = { id: crypto.randomUUID(), nickname: this.nickname, score: Math.max(0, Math.round(this.score)), capturedChips: this.captured, goldenChips: this.golden, bombPenalties: this.bombs, bestCombo: this.bestCombo, speedCaptures: this.speedCaptureCount, eligibleOpportunities: this.eligible, accuracy: calculateAccuracy(this.captured, this.eligible), xpEarned: calculateXp(this.score, this.bestCombo, this.captured), mode: 'webcam', createdAt: new Date().toISOString(), personalBest: false, localOnly: true };
    this.callbacks.onHud(this.hud('completed')); this.callbacks.onFinish(result);
  }
}

export class GameEngine {
  private game: Phaser.Game | null = null;
  private scene: BiteScene | null = null;

  start(parent: HTMLElement, options: { inputProvider: GameInputProvider; callbacks: GameEngineCallbacks; gameConfig: GameConfiguration; nickname: string }) {
    this.scene = new BiteScene(options);
    this.game = new Phaser.Game({ type: Phaser.AUTO, parent, width: 960, height: 540, transparent: true, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: this.scene, render: { antialias: true, pixelArt: false } });
  }
  setPaused(paused: boolean) { this.scene?.setPaused(paused); }
  pause() { this.scene?.togglePause(); }
  end() { this.scene?.stop(); }
  destroy() { this.game?.destroy(true); this.game = null; this.scene = null; }
}

export class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOscillator: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  ensure(): void {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.58;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 16;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.12;
      this.master.connect(compressor);
      compressor.connect(this.context.destination);

      const noiseFrames = Math.ceil(this.context.sampleRate * 0.6);
      this.noiseBuffer = this.context.createBuffer(
        1,
        noiseFrames,
        this.context.sampleRate
      );
      const noiseData = this.noiseBuffer.getChannelData(0);
      for (let index = 0; index < noiseFrames; index += 1) {
        noiseData[index] = Math.random() * 2 - 1;
      }

      const engineFilter = this.context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 520;
      this.engineGain = this.context.createGain();
      this.engineGain.gain.value = 0.0001;
      this.engineOscillator = this.context.createOscillator();
      this.engineOscillator.type = 'sawtooth';
      this.engineOscillator.frequency.value = 48;
      this.engineOscillator.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOscillator.start();
    }
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : 0.58,
        this.context.currentTime,
        0.02
      );
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  engine(speedRatio: number, throttle: number, overdrive: boolean): void {
    if (!this.context || !this.engineGain || !this.engineOscillator) return;
    const now = this.context.currentTime;
    const ratio = Math.max(0, Math.min(1.25, speedRatio));
    const frequency =
      44 + ratio * 94 + Math.abs(throttle) * 18 + (overdrive ? 35 : 0);
    this.engineOscillator.frequency.setTargetAtTime(frequency, now, 0.035);
    this.engineGain.gain.setTargetAtTime(0.018 + ratio * 0.035, now, 0.05);
  }

  stopEngine(): void {
    if (this.context && this.engineGain) {
      this.engineGain.gain.setTargetAtTime(
        0.0001,
        this.context.currentTime,
        0.08
      );
    }
  }

  impact(power: number): void {
    const amount = Math.max(0.15, Math.min(1, power));
    this.noise(0.055 + amount * 0.1, 0.11 + amount * 0.22, 420 + amount * 900);
    this.tone(
      78 + amount * 35,
      0.07 + amount * 0.08,
      'square',
      0.055 + amount * 0.09,
      34
    );
  }

  wreck(chain: number): void {
    const step = Math.min(7, chain);
    this.noise(0.12, 0.18, 950 + step * 120);
    this.tone(130 + step * 34, 0.11, 'sawtooth', 0.09, 58 + step * 8);
  }

  pickup(pitch = 0): void {
    this.tone(480 + pitch * 36, 0.045, 'sine', 0.045, 720 + pitch * 44);
  }

  shot(): void {
    this.noise(0.028, 0.045, 2100);
    this.tone(190, 0.035, 'square', 0.025, 90);
  }

  levelUp(): void {
    this.tone(320, 0.11, 'square', 0.07, 510);
    window.setTimeout(() => this.tone(510, 0.14, 'square', 0.075, 760), 80);
    window.setTimeout(() => this.tone(760, 0.2, 'sine', 0.08, 1080), 170);
  }

  overdrive(): void {
    this.noise(0.22, 0.16, 1600);
    this.tone(110, 0.42, 'sawtooth', 0.09, 330);
  }

  heal(): void {
    this.tone(420, 0.12, 'sine', 0.06, 820);
  }

  private tone(
    startFrequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    endFrequency: number
  ): void {
    if (!this.context || !this.master || this.muted) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency),
      now + duration
    );
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  private noise(duration: number, volume: number, cutoff: number): void {
    if (!this.context || !this.master || !this.noiseBuffer || this.muted)
      return;
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.buffer = this.noiseBuffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    const offset =
      Math.random() * Math.max(0.001, this.noiseBuffer.duration - duration);
    source.start(now, offset, duration);
    source.stop(now + duration + 0.01);
  }
}

export const audio = new AudioDirector();

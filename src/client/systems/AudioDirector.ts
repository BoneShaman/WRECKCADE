const SAMPLE_URLS = {
  impactLight: new URL(
    '../../../assets/audio/impact_light.wav',
    import.meta.url
  ).href,
  impactMedium: new URL(
    '../../../assets/audio/impact_medium.wav',
    import.meta.url
  ).href,
  impactHeavy: new URL(
    '../../../assets/audio/impact_heavy.wav',
    import.meta.url
  ).href,
  wreckChain: new URL('../../../assets/audio/wreck_chain.wav', import.meta.url)
    .href,
  driftLoop: new URL('../../../assets/audio/drift_loop.wav', import.meta.url)
    .href,
  engineGritLoop: new URL(
    '../../../assets/audio/engine_grit_loop.wav',
    import.meta.url
  ).href,
  engineRev: new URL('../../../assets/audio/engine_rev.wav', import.meta.url)
    .href,
} as const;

type SampleName = keyof typeof SAMPLE_URLS;
type SampleVoiceGroup = 'general' | 'crash';

const WRECK_COOLDOWN_SECONDS = 0.085;
const MAX_CRASH_SAMPLE_VOICES = 3;

export class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOscillator: OscillatorNode | null = null;
  private engineHarmonic: OscillatorNode | null = null;
  private engineHarmonicGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineTextureGain: GainNode | null = null;
  private engineTextureSource: AudioBufferSourceNode | null = null;
  private driftGain: GainNode | null = null;
  private driftSource: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly samples = new Map<SampleName, AudioBuffer>();
  private sampleLoad: Promise<void> | null = null;
  private lastThrottle = 0;
  private lastEngineRatio = 0;
  private lastRevAt = -10;
  private lastWreckAt = -10;
  private lastWreckInputAt = -10;
  private lastWreckMilestone = 0;
  private pendingWreckChain = 0;
  private wreckFlushTimer: number | null = null;
  private activeCrashSampleVoices = 0;
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

      this.engineFilter = this.context.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 520;
      this.engineFilter.Q.value = 1.15;
      this.engineGain = this.context.createGain();
      this.engineGain.gain.value = 0.0001;
      this.engineOscillator = this.context.createOscillator();
      this.engineOscillator.type = 'sawtooth';
      this.engineOscillator.frequency.value = 48;
      this.engineOscillator.connect(this.engineFilter);

      this.engineHarmonicGain = this.context.createGain();
      this.engineHarmonicGain.gain.value = 0.22;
      this.engineHarmonic = this.context.createOscillator();
      this.engineHarmonic.type = 'triangle';
      this.engineHarmonic.frequency.value = 96;
      this.engineHarmonic.connect(this.engineHarmonicGain);
      this.engineHarmonicGain.connect(this.engineFilter);

      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOscillator.start();
      this.engineHarmonic.start();

      this.engineTextureGain = this.context.createGain();
      this.engineTextureGain.gain.value = 0.0001;
      this.engineTextureGain.connect(this.master);
      this.driftGain = this.context.createGain();
      this.driftGain.gain.value = 0.0001;
      this.driftGain.connect(this.master);

      this.loadSamples(this.context);
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
    if (
      !this.context ||
      !this.engineGain ||
      !this.engineOscillator ||
      !this.engineHarmonic
    )
      return;
    const now = this.context.currentTime;
    const ratio = Math.max(0, Math.min(1.25, speedRatio));
    const throttleAmount = Math.min(1, Math.abs(throttle));
    const frequency =
      42 + ratio * 88 + throttleAmount * 20 + (overdrive ? 34 : 0);
    this.engineOscillator.frequency.setTargetAtTime(frequency, now, 0.035);
    this.engineHarmonic.frequency.setTargetAtTime(
      frequency * (1.98 + ratio * 0.025),
      now,
      0.04
    );
    this.engineGain.gain.setTargetAtTime(0.014 + ratio * 0.034, now, 0.05);
    this.engineFilter?.frequency.setTargetAtTime(
      430 + ratio * 780 + throttleAmount * 210 + (overdrive ? 460 : 0),
      now,
      0.055
    );
    this.engineTextureGain?.gain.setTargetAtTime(
      0.11 + ratio * 0.2 + throttleAmount * 0.04,
      now,
      0.07
    );
    if (this.engineTextureSource) {
      this.engineTextureSource.playbackRate.setTargetAtTime(
        0.72 + ratio * 0.68 + (overdrive ? 0.16 : 0),
        now,
        0.06
      );
    }

    const launch = throttleAmount > 0.62 && this.lastThrottle <= 0.38;
    const surge = ratio - this.lastEngineRatio > 0.1 && throttleAmount > 0.72;
    if ((launch || surge) && now - this.lastRevAt > 0.58) {
      this.playSample('engineRev', 0.48, 0.86 + ratio * 0.22, 0, 0);
      this.lastRevAt = now;
    }
    this.lastThrottle = throttleAmount;
    this.lastEngineRatio = ratio;
  }

  drift(intensity: number, speedRatio = 1): void {
    if (!this.context || !this.driftGain) return;
    const amount = Math.max(0, Math.min(1, intensity));
    const now = this.context.currentTime;
    this.driftGain.gain.setTargetAtTime(
      amount < 0.04 ? 0.0001 : 0.18 + amount * 0.58,
      now,
      amount > 0.04 ? 0.035 : 0.085
    );
    if (this.driftSource) {
      this.driftSource.playbackRate.setTargetAtTime(
        0.78 + Math.max(0, Math.min(1.25, speedRatio)) * 0.32 + amount * 0.13,
        now,
        0.06
      );
    }
  }

  stopDrift(): void {
    if (this.context && this.driftGain) {
      this.driftGain.gain.setTargetAtTime(
        0.0001,
        this.context.currentTime,
        0.07
      );
    }
  }

  stopEngine(): void {
    if (this.context && this.engineGain) {
      this.engineGain.gain.setTargetAtTime(
        0.0001,
        this.context.currentTime,
        0.08
      );
      this.engineTextureGain?.gain.setTargetAtTime(
        0.0001,
        this.context.currentTime,
        0.08
      );
      this.stopDrift();
    }
    this.lastThrottle = 0;
    this.lastEngineRatio = 0;
  }

  impact(power: number): void {
    const amount = Math.max(0.15, Math.min(1, power));
    const sample: SampleName =
      amount < 0.38
        ? 'impactLight'
        : amount < 0.72
          ? 'impactMedium'
          : 'impactHeavy';
    this.playSample(
      sample,
      0.62 + amount * 0.36,
      0.93 + Math.random() * 0.13 + amount * 0.035,
      0,
      (Math.random() * 2 - 1) * 0.18,
      'crash'
    );
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
    if (!this.context || this.muted) return;
    const safeChain = Math.max(0, Math.floor(chain));
    const now = this.context.currentTime;
    if (now - this.lastWreckInputAt > 0.72) {
      this.lastWreckMilestone = 0;
      this.pendingWreckChain = 0;
    }
    this.lastWreckInputAt = now;

    const elapsed = now - this.lastWreckAt;
    if (elapsed >= WRECK_COOLDOWN_SECONDS && this.wreckFlushTimer === null) {
      this.emitWreckLayer(safeChain);
      return;
    }

    this.pendingWreckChain = Math.max(this.pendingWreckChain, safeChain);
    if (this.wreckFlushTimer !== null) return;
    const waitMs = Math.max(
      8,
      Math.ceil((WRECK_COOLDOWN_SECONDS - Math.max(0, elapsed)) * 1000)
    );
    this.wreckFlushTimer = window.setTimeout(() => {
      this.wreckFlushTimer = null;
      const pendingChain = this.pendingWreckChain;
      this.pendingWreckChain = 0;
      this.emitWreckLayer(pendingChain);
    }, waitMs);
  }

  pickup(pitch = 0): void {
    this.tone(480 + pitch * 36, 0.045, 'sine', 0.045, 720 + pitch * 44);
  }

  shot(): void {
    this.noise(0.028, 0.045, 2100);
    this.tone(190, 0.035, 'square', 0.025, 90);
  }

  levelUp(): void {
    this.stopDrift();
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

  private emitWreckLayer(chain: number): void {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const step = Math.min(7, chain);
    const milestone =
      chain >= 19 ? 4 : chain >= 11 ? 3 : chain >= 5 ? 2 : chain >= 2 ? 1 : 0;
    const reachedMilestone = milestone > this.lastWreckMilestone;
    this.lastWreckMilestone = Math.max(this.lastWreckMilestone, milestone);
    this.lastWreckAt = now;

    const sample: SampleName = reachedMilestone
      ? milestone >= 1
        ? 'wreckChain'
        : 'impactMedium'
      : step >= 4
        ? 'impactHeavy'
        : step >= 2
          ? 'impactMedium'
          : 'impactLight';
    const layerWeight = reachedMilestone
      ? 0.52 + Math.min(0.14, milestone * 0.035)
      : 0.36 + Math.min(0.12, step * 0.018);
    this.playSample(
      sample,
      layerWeight,
      0.91 + step * 0.018 + Math.random() * 0.12,
      0,
      (Math.random() * 2 - 1) * 0.28,
      'crash'
    );

    const milestoneLift = reachedMilestone ? 1 + milestone * 0.11 : 0.72;
    this.noise(
      0.07 + step * 0.006,
      (0.065 + step * 0.007) * milestoneLift,
      820 + step * 135
    );
    this.tone(
      122 + step * 31 + milestone * 18,
      0.075 + milestone * 0.008,
      'sawtooth',
      (0.035 + step * 0.0035) * milestoneLift,
      54 + step * 7 + milestone * 9
    );
  }

  private loadSamples(context: AudioContext): void {
    if (this.sampleLoad) return;
    this.sampleLoad = Promise.all(
      (Object.entries(SAMPLE_URLS) as [SampleName, string][]).map(
        async ([name, url]) => {
          try {
            const response = await fetch(url);
            if (!response.ok) return;
            const buffer = await context.decodeAudioData(
              await response.arrayBuffer()
            );
            if (this.context === context) this.samples.set(name, buffer);
          } catch {
            // The synthesized layer below is the intentional offline fallback.
          }
        }
      )
    ).then(() => {
      if (this.context === context) this.startTextureLoops();
    });
  }

  private startTextureLoops(): void {
    if (!this.context) return;
    const engineBuffer = this.samples.get('engineGritLoop');
    if (engineBuffer && this.engineTextureGain && !this.engineTextureSource) {
      this.engineTextureSource = this.context.createBufferSource();
      this.engineTextureSource.buffer = engineBuffer;
      this.engineTextureSource.loop = true;
      this.engineTextureSource.connect(this.engineTextureGain);
      this.engineTextureSource.start();
    }

    const driftBuffer = this.samples.get('driftLoop');
    if (driftBuffer && this.driftGain && !this.driftSource) {
      this.driftSource = this.context.createBufferSource();
      this.driftSource.buffer = driftBuffer;
      this.driftSource.loop = true;
      this.driftSource.connect(this.driftGain);
      this.driftSource.start();
    }
  }

  private playSample(
    name: SampleName,
    volume: number,
    playbackRate: number,
    delay: number,
    pan: number,
    voiceGroup: SampleVoiceGroup = 'general'
  ): boolean {
    if (!this.context || !this.master || this.muted) return false;
    const buffer = this.samples.get(name);
    if (!buffer) return false;
    if (
      voiceGroup === 'crash' &&
      this.activeCrashSampleVoices >= MAX_CRASH_SAMPLE_VOICES
    )
      return false;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    const when = this.context.currentTime + Math.max(0, delay);
    source.buffer = buffer;
    source.playbackRate.value = Math.max(0.55, Math.min(1.8, playbackRate));
    gain.gain.value = Math.max(0, Math.min(1.2, volume));
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(gain);
    gain.connect(panner);
    panner.connect(this.master);
    if (voiceGroup === 'crash') this.activeCrashSampleVoices += 1;
    source.onended = () => {
      if (voiceGroup === 'crash') {
        this.activeCrashSampleVoices = Math.max(
          0,
          this.activeCrashSampleVoices - 1
        );
      }
      source.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
    source.start(when);
    return true;
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

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Track } from '@/content/tracks';
import { formatDuration } from '@/content/tracks';

interface Props {
  track: Track | null;
  onEnded?: () => void;
}

const VOLUME_STORAGE_KEY = 'creative-music-volume';

/**
 * Thin wrapper over <audio>. Also owns the Web Audio graph that
 * drives the spectrum visualizer and the volume state that drives
 * the volume slider.
 *
 * Web Audio pipeline:
 *   <audio>  →  MediaElementAudioSourceNode  →  AnalyserNode  →  destination
 *
 * The AnalyserNode is exposed so the SpectrumBars component can read
 * real frequency data via getByteFrequencyData() on every RAF. The
 * graph is created lazily on the first real track play (AudioContext
 * must be started from a user gesture per browser autoplay policy).
 *
 * Cross-origin audio requires crossOrigin="anonymous" on the element
 * so Web Audio can decode R2-hosted files without producing silent
 * output. R2's existing CORS policy allows GET from the admin/site
 * origins, so this just works.
 *
 * Falls back to a simulated timer when the track has no audioUrl
 * (placeholder seed data) — Web Audio is bypassed entirely in that
 * case and the spectrum renders its decorative sine fallback.
 */
export function useAudioPlayer({ track, onEnded }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const simulatedTimerRef = useRef<number | null>(null);

  // Web Audio graph — created lazily (see ensureAudioGraph). One
  // MediaElementSource per <audio> element for its entire lifetime;
  // swapping track.src later still flows through the same source.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Volume state — persisted across sessions so the viewer's preferred
  // level survives reloads. Default 50 % on first visit.
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const saved = typeof window !== 'undefined'
        ? window.localStorage.getItem(VOLUME_STORAGE_KEY)
        : null;
      const n = saved !== null ? parseFloat(saved) : NaN;
      return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.5;
    } catch {
      return 0.5;
    }
  });
  const [muted, setMuted] = useState(false);

  // Sync React state → <audio> element props. Volume adjustments
  // still apply correctly through the Web Audio graph — the element's
  // .volume is applied BEFORE the source node in the pipeline.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.muted = muted;
    }
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    } catch {
      /* storage unavailable — acceptable, state is in memory */
    }
  }, [volume, muted]);

  // Swap sources when the selected track changes
  useEffect(() => {
    setElapsed(0);
    setIsPlaying(false);
    if (simulatedTimerRef.current !== null) {
      window.clearInterval(simulatedTimerRef.current);
      simulatedTimerRef.current = null;
    }
  }, [track?.id]);

  const ensureAudioGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return null;
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      const ctx = new AudioContextClass();
      const source = ctx.createMediaElementSource(audio);
      const an = ctx.createAnalyser();
      // 128 fftSize → 64 frequency bins. Spectrum shows 24 bars;
      // we bucket bins with a mild log bias to distribute energy.
      an.fftSize = 128;
      an.smoothingTimeConstant = 0.82;
      source.connect(an);
      an.connect(ctx.destination);
      audioCtxRef.current = ctx;
      sourceRef.current = source;
      setAnalyser(an);
      return ctx;
    } catch {
      // CORS failure, unsupported browser, or source already claimed —
      // continue without an analyser, spectrum falls back to decorative.
      return null;
    }
  }, []);

  // Close the audio context on unmount so contexts don't accumulate
  // across navigations. Only ever runs once (MusicPanel mounts once
  // per creative-page visit).
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      sourceRef.current = null;
    };
  }, []);

  const clearSimulation = useCallback(() => {
    if (simulatedTimerRef.current !== null) {
      window.clearInterval(simulatedTimerRef.current);
      simulatedTimerRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    if (!track) return;
    const audio = audioRef.current;
    if (audio && track.audioUrl) {
      const ctx = ensureAudioGraph();
      // Browser autoplay policy: the context is born 'suspended'
      // and must be resumed from a user gesture. The play click
      // IS the gesture. Ignore resume failures — they only matter
      // if the user has disabled audio output, in which case the
      // play() call below will also fail and we'll stay paused.
      if (ctx?.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      audio.play().catch(() => {
        /* ignore autoplay errors */
      });
    } else {
      // Simulated playback for placeholder tracks (no audioUrl)
      clearSimulation();
      simulatedTimerRef.current = window.setInterval(() => {
        setElapsed((e) => {
          if (e + 0.25 >= track.duration) {
            clearSimulation();
            setIsPlaying(false);
            onEnded?.();
            return 0;
          }
          return e + 0.25;
        });
      }, 250);
    }
    setIsPlaying(true);
  }, [track, onEnded, clearSimulation, ensureAudioGraph]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    clearSimulation();
    setIsPlaying(false);
  }, [clearSimulation]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    // Moving the slider off zero auto-unmutes — matches the standard
    // OS / YouTube volume-control behavior viewers expect.
    if (clamped > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  useEffect(() => () => clearSimulation(), [clearSimulation]);

  const audioElement = (
    <audio
      ref={audioRef}
      src={track?.audioUrl ?? undefined}
      // Required for Web Audio to read cross-origin audio data without
      // producing a silent MediaElementSource. R2's CORS policy must
      // include the site origin under AllowedOrigins on GET (already
      // configured via VERCEL-SETUP.md §4g).
      crossOrigin="anonymous"
      preload="none"
      onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      onEnded={() => {
        setIsPlaying(false);
        setElapsed(0);
        onEnded?.();
      }}
    />
  );

  return {
    audioElement,
    isPlaying,
    elapsed,
    elapsedLabel: formatDuration(elapsed),
    durationLabel: track ? formatDuration(track.duration) : '0:00',
    play,
    pause,
    toggle,
    analyser,
    volume,
    muted,
    setVolume,
    toggleMute,
  };
}

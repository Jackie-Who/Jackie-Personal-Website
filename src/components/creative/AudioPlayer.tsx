import { useCallback, useEffect, useRef, useState } from 'react';
import type { Track } from '@/content/tracks';
import { formatDuration } from '@/content/tracks';

interface Props {
  track: Track | null;
  onEnded?: () => void;
}

/**
 * Thin wrapper over <audio>. Exposes play / pause / seek / elapsed
 * to the surrounding panel. Audio URL is optional — when null the
 * player runs a simulated timer (until Phase 5 wires real files in
 * from R2) so the UI can be validated end-to-end.
 */
export function useAudioPlayer({ track, onEnded }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const simulatedTimerRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Swap sources when the selected track changes
  useEffect(() => {
    setElapsed(0);
    setIsPlaying(false);
    if (simulatedTimerRef.current !== null) {
      window.clearInterval(simulatedTimerRef.current);
      simulatedTimerRef.current = null;
    }
  }, [track?.id]);

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
      audio.play().catch(() => {
        /* ignore autoplay errors */
      });
    } else {
      // Simulated playback for placeholder tracks
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
  }, [track, onEnded, clearSimulation]);

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

  useEffect(() => () => clearSimulation(), [clearSimulation]);

  const audioElement = (
    <audio
      ref={audioRef}
      src={track?.audioUrl ?? undefined}
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
  };
}

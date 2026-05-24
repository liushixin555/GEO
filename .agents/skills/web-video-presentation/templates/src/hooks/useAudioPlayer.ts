import { useState, useEffect, useRef, useCallback } from "react";

export type PlaybackMode = "manual" | "audio" | "auto";

interface AudioHandle {
  el: HTMLAudioElement;
  onEnded: () => void;
}

/**
 * Estimate fallback duration in ms for a given narration text.
 * Used when audioSrc is null (no audio file available).
 */
export function estimateMs(text: string): number {
  if (!text) return 1500;
  const charCount = text.length;
  return Math.max(1500, charCount * 200);
}

export interface UseAudioPlayerOptions {
  /** Audio source URL; null to skip audio (use fallback timer) */
  audioSrc: string | null;
  /** Current playback mode */
  mode: PlaybackMode;
  /** Whether auto mode has been started (gate passed) */
  autoStarted: boolean;
  /** Callback when narration ends (for auto-advance) */
  onEnded?: () => void;
  /** Fallback duration (ms) when no audioSrc */
  estimateFallbackMs?: number;
}

export interface UseAudioPlayerReturn {
  /** Whether audio is currently playing */
  playing: boolean;
  /** Force-play the current audio */
  play: () => void;
  /** Force-pause the current audio */
  pause: () => void;
}

export function useAudioPlayer({
  audioSrc,
  mode,
  autoStarted,
  onEnded,
  estimateFallbackMs,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const [playing, setPlaying] = useState(false);
  const handleRef = useRef<AudioHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (handleRef.current) {
      handleRef.current.el.pause();
      handleRef.current.el.removeAttribute("src");
      handleRef.current.el.removeEventListener(
        "ended",
        handleRef.current.onEnded,
      );
      handleRef.current = null;
    }
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    cleanup();
    setPlaying(true);

    if (audioSrc) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = audioSrc;
      const handleEnded = () => {
        setPlaying(false);
        onEndedRef.current?.();
      };
      audio.addEventListener("ended", handleEnded);
      handleRef.current = { el: audio, onEnded: handleEnded };
      audio.play().catch(() => {
        setPlaying(false);
      });
    } else {
      const ms = estimateFallbackMs ?? 1500;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setPlaying(false);
        onEndedRef.current?.();
      }, ms);
    }
  }, [audioSrc, cleanup, estimateFallbackMs]);

  const pause = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    const shouldPlay =
      mode === "audio" || (mode === "auto" && autoStarted);

    if (shouldPlay) {
      play();
    } else {
      cleanup();
    }
  }, [mode, autoStarted, audioSrc, play, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { playing, play, pause };
}

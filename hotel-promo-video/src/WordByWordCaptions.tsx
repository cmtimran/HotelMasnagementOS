import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";

interface Props {
  captions: Caption[];
  style?: React.CSSProperties;
}

export const WordByWordCaptions: React.FC<Props> = ({ captions, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  // Find the currently active word index
  const activeWordIdx = useMemo(() => {
    return captions.findIndex(
      (c) => currentMs >= c.startMs && currentMs < c.endMs
    );
  }, [captions, currentMs]);

  // Group words into readable visual chunks (sentences or groups of ~6-8 words)
  const activeChunk = useMemo(() => {
    if (captions.length === 0) return [];
    
    // Find closest word index
    let idx = activeWordIdx;
    if (idx === -1) {
      idx = captions.findIndex((c) => c.startMs > currentMs);
      if (idx === -1) idx = captions.length - 1;
      else idx = Math.max(0, idx - 1);
    }

    // Determine sentence/clause boundaries around current word
    const CHUNK_SIZE = 7;
    const chunkStart = Math.floor(idx / CHUNK_SIZE) * CHUNK_SIZE;
    const chunkEnd = Math.min(captions.length, chunkStart + CHUNK_SIZE);

    return captions.slice(chunkStart, chunkEnd);
  }, [captions, currentMs, activeWordIdx]);

  if (activeChunk.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "6px 10px",
        padding: "16px 28px",
        borderRadius: "20px",
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.2)",
        maxWidth: "960px",
        margin: "0 auto",
        ...style,
      }}
    >
      {activeChunk.map((word, i) => {
        const isCurrent = currentMs >= word.startMs && currentMs < word.endMs;
        const isPast = currentMs >= word.endMs;

        return (
          <span
            key={`${word.startMs}-${i}`}
            style={{
              fontFamily:
                "'Hind Siliguri', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: "30px",
              fontWeight: isCurrent ? 800 : isPast ? 700 : 500,
              color: isCurrent
                ? "#FDE047" // Bright energetic golden yellow
                : isPast
                ? "#FFFFFF"
                : "rgba(255, 255, 255, 0.45)",
              scale: isCurrent ? "1.12" : "1",
              backgroundColor: isCurrent ? "rgba(234, 179, 8, 0.2)" : "transparent",
              padding: isCurrent ? "2px 8px" : "2px 0px",
              borderRadius: "8px",
              textShadow: isCurrent
                ? "0 0 20px rgba(250, 204, 21, 0.8)"
                : isPast
                ? "0 2px 8px rgba(0,0,0,0.6)"
                : "none",
              transition: "color 0.1s ease, scale 0.1s ease",
              display: "inline-block",
            }}
          >
            {word.text.trim()}
          </span>
        );
      })}
    </div>
  );
};

import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

export const Scene4CTA: React.FC = () => {
  const frame = useCurrentFrame();

  const ctaScale = interpolate(frame, [0, 25], [0.85, 1], {
    easing: Easing.spring({ damping: 15 }),
    extrapolateRight: "clamp",
  });
  const ctaOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Glowing pulse on the CTA button
  const buttonGlow = interpolate(frame, [20, 60, 100, 140, 180, 220], [1, 1.05, 1, 1.05, 1, 1.05], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#070C18",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: "absolute",
          width: "800px",
          height: "800px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(7, 12, 24, 0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          opacity: ctaOpacity,
          scale: `${ctaScale}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          zIndex: 10,
        }}
      >
        {/* Metric stats counter banner */}
        <div
          style={{
            display: "flex",
            gap: "36px",
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "20px",
            padding: "16px 36px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#38BDF8", fontSize: "32px", fontWeight: 900 }}>
              99.9%
            </div>
            <div style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600 }}>
              বিলিং একুরেসি
            </div>
          </div>
          <div style={{ width: "1px", backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#34D399", fontSize: "32px", fontWeight: 900 }}>
              3x দ্রুত
            </div>
            <div style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600 }}>
              এক্সপ্রেস চেক-ইন
            </div>
          </div>
          <div style={{ width: "1px", backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#FBBF24", fontSize: "32px", fontWeight: 900 }}>
              0%
            </div>
            <div style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600 }}>
              ডাবল বুকিং ঝুঁকি
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "52px",
            fontWeight: 900,
            color: "#FFFFFF",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          হোটেল ম্যানেজমেন্ট এবার হবে{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #10B981 0%, #3B82F6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            আরও স্মার্ট ও নির্ভুল
          </span>
        </h1>

        {/* CTA Button */}
        <div
          style={{
            scale: `${buttonGlow}`,
            display: "inline-flex",
            alignItems: "center",
            gap: "12px",
            background: "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
            color: "#FFFFFF",
            padding: "18px 44px",
            borderRadius: "16px",
            fontSize: "22px",
            fontWeight: 800,
            boxShadow:
              "0 0 35px rgba(37, 99, 235, 0.7), 0 10px 20px rgba(0,0,0,0.5)",
            cursor: "pointer",
          }}
        >
          <span>আজই শুরু করুন</span>
          <span style={{ fontSize: "20px" }}>→</span>
        </div>

        {/* Website link */}
        <div
          style={{
            color: "#64748B",
            fontSize: "16px",
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          Powered by <strong style={{ color: "#94A3B8" }}>Hotel Management OS</strong> · Cloud PMS
        </div>
      </div>
    </div>
  );
};

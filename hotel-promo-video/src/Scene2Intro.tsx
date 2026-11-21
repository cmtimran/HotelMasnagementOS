import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

export const Scene2Intro: React.FC = () => {
  const frame = useCurrentFrame();

  // Smooth entrance
  const heroScale = interpolate(frame, [0, 25], [0.85, 1], {
    easing: Easing.spring({ damping: 15 }),
    extrapolateRight: "clamp",
  });
  const heroOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Glowing logo ring rotation
  const glowRotate = interpolate(frame, [0, 200], [0, 360]);

  // Floating badges entrance
  const badge1X = interpolate(frame, [15, 35], [-40, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateRight: "clamp",
  });
  const badge2X = interpolate(frame, [25, 45], [40, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#080E1A",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
      }}
    >
      {/* Dynamic Cyan / Blue ambient glow */}
      <div
        style={{
          position: "absolute",
          width: "700px",
          height: "700px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, rgba(14, 165, 233, 0.05) 50%, rgba(8, 14, 26, 0) 70%)",
          rotate: `${glowRotate}deg`,
          pointerEvents: "none",
        }}
      />

      {/* Main SaaS Showcase Container */}
      <div
        style={{
          opacity: heroOpacity,
          scale: `${heroScale}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          zIndex: 10,
        }}
      >
        {/* Top Product Category Pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            padding: "8px 24px",
            borderRadius: "999px",
            boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
          }}
        >
          <span style={{ fontSize: "18px" }}>✨</span>
          <span
            style={{
              color: "#60A5FA",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            The Next-Generation Hotel PMS
          </span>
        </div>

        {/* Hero Title */}
        <h1
          style={{
            fontSize: "64px",
            fontWeight: 900,
            color: "#FFFFFF",
            margin: 0,
            textAlign: "center",
            letterSpacing: "-0.02em",
            textShadow: "0 10px 40px rgba(0,0,0,0.8)",
          }}
        >
          Hotel Management{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #38BDF8 0%, #6366F1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            OS
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "24px",
            color: "#94A3B8",
            margin: 0,
            maxWidth: "750px",
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          আপনার হোটেলের প্রতিটি অপারেশনের একমাত্র পূর্ণাঙ্গ আধুনিক সমাধান
        </p>

        {/* Feature Badges Grid */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "16px",
          }}
        >
          <div
            style={{
              translate: `${badge1X}px 0px`,
              display: "flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: "14px 22px",
              borderRadius: "16px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            }}
          >
            <span style={{ fontSize: "22px" }}>⚡</span>
            <div>
              <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px" }}>
                100% Real-Time
              </div>
              <div style={{ color: "#64748B", fontSize: "12px" }}>Instant Auto Sync</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: "14px 22px",
              borderRadius: "16px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            }}
          >
            <span style={{ fontSize: "22px" }}>🏢</span>
            <div>
              <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px" }}>
                Multi-Property
              </div>
              <div style={{ color: "#64748B", fontSize: "12px" }}>Chain & Single Resort</div>
            </div>
          </div>

          <div
            style={{
              translate: `${badge2X}px 0px`,
              display: "flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: "14px 22px",
              borderRadius: "16px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            }}
          >
            <span style={{ fontSize: "22px" }}>🛡️</span>
            <div>
              <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px" }}>
                Zero Error Folios
              </div>
              <div style={{ color: "#64748B", fontSize: "12px" }}>Dual Receipts & Vouchers</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

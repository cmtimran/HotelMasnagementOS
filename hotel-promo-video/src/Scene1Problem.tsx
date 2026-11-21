import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const Scene1Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animations
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 20], [30, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateRight: "clamp",
  });

  // Card 1: Paper clutter
  const card1Scale = interpolate(frame, [15, 35], [0.85, 1], {
    easing: Easing.spring({ damping: 14 }),
    extrapolateRight: "clamp",
  });
  const card1Opacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Card 2: Slow Check-in
  const card2Scale = interpolate(frame, [45, 65], [0.85, 1], {
    easing: Easing.spring({ damping: 14 }),
    extrapolateRight: "clamp",
  });
  const card2Opacity = interpolate(frame, [45, 60], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Card 3: Mismatch & Double Bookings
  const card3Scale = interpolate(frame, [75, 95], [0.85, 1], {
    easing: Easing.spring({ damping: 14 }),
    extrapolateRight: "clamp",
  });
  const card3Opacity = interpolate(frame, [75, 90], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Subtle background pulse
  const bgGlow = interpolate(frame, [0, 120, 230], [0.15, 0.3, 0.15], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#090D16",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: "60px",
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
      }}
    >
      {/* Background ambient red/danger gradient glow */}
      <div
        style={{
          position: "absolute",
          top: "-150px",
          width: "900px",
          height: "500px",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(239, 68, 68, ${bgGlow}) 0%, rgba(9, 13, 22, 0) 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Header Badge */}
      <div
        style={{
          opacity: titleOpacity,
          translate: `0px ${titleY}px`,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          padding: "8px 20px",
          borderRadius: "999px",
          marginBottom: "16px",
        }}
      >
        <span style={{ fontSize: "16px" }}>⚠️</span>
        <span
          style={{
            color: "#F87171",
            fontSize: "15px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Traditional Hotel Challenges
        </span>
      </div>

      {/* Main Title */}
      <h1
        style={{
          opacity: titleOpacity,
          translate: `0px ${titleY}px`,
          fontSize: "44px",
          fontWeight: 800,
          color: "#FFFFFF",
          textAlign: "center",
          margin: 0,
          maxWidth: "880px",
          lineHeight: 1.25,
        }}
      >
        পুরনো স্লো সফটওয়্যার আর কাগজের খাতায়{" "}
        <span style={{ color: "#EF4444" }}>আপনি কি ক্লান্ত?</span>
      </h1>

      {/* 3 Problem Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          marginTop: "44px",
          width: "1080px",
        }}
      >
        {/* Card 1 */}
        <div
          style={{
            opacity: card1Opacity,
            scale: `${card1Scale}`,
            backgroundColor: "rgba(30, 41, 59, 0.7)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "20px",
            padding: "26px",
            boxShadow: "0 20px 30px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "14px",
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
            }}
          >
            📋
          </div>
          <h3 style={{ margin: 0, fontSize: "20px", color: "#FFFFFF", fontWeight: 700 }}>
            ম্যানুয়াল কাগজের খাতা
          </h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#94A3B8", lineHeight: 1.5 }}>
            কাগজের রেজিস্টার ও ফাইল হারানোর ভয়, অডিট ও বিলিংয়ে হিসাবের মারাত্মক ভুল।
          </p>
          <div
            style={{
              marginTop: "auto",
              padding: "6px 12px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#FCA5A5",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              width: "fit-content",
            }}
          >
            ✕ অডিট অসঙ্গতি
          </div>
        </div>

        {/* Card 2 */}
        <div
          style={{
            opacity: card2Opacity,
            scale: `${card2Scale}`,
            backgroundColor: "rgba(30, 41, 59, 0.7)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "20px",
            padding: "26px",
            boxShadow: "0 20px 30px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "14px",
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
            }}
          >
            ⏳
          </div>
          <h3 style={{ margin: 0, fontSize: "20px", color: "#FFFFFF", fontWeight: 700 }}>
            স্লো ফ্রন্ট ডেস্ক চেক-ইন
          </h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#94A3B8", lineHeight: 1.5 }}>
            অতিথিদের দীর্ঘ লাইনে অপেক্ষা, পরিচয়পত্র টাইপ করার জটিলতা ও অসন্তুষ্ট কাস্টমার।
          </p>
          <div
            style={{
              marginTop: "auto",
              padding: "6px 12px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#FCA5A5",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              width: "fit-content",
            }}
          >
            ✕ সময় অপচয়
          </div>
        </div>

        {/* Card 3 */}
        <div
          style={{
            opacity: card3Opacity,
            scale: `${card3Scale}`,
            backgroundColor: "rgba(30, 41, 59, 0.7)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "20px",
            padding: "26px",
            boxShadow: "0 20px 30px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "14px",
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
            }}
          >
            ⚡
          </div>
          <h3 style={{ margin: 0, fontSize: "20px", color: "#FFFFFF", fontWeight: 700 }}>
            বুকিং মিসম্যাচ ও ডাবল বুকিং
          </h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#94A3B8", lineHeight: 1.5 }}>
            OTA চ্যানেল ও ওয়াক-ইন মিসম্যাচে রুম ডাবল বুকিং এবং রাজস্বের বিশাল ক্ষতি।
          </p>
          <div
            style={{
              marginTop: "auto",
              padding: "6px 12px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#FCA5A5",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              width: "fit-content",
            }}
          >
            ✕ রাজস্ব ক্ষতি
          </div>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

export const Scene3Features: React.FC = () => {
  const frame = useCurrentFrame();

  // Left Rack entrance
  const rackX = interpolate(frame, [0, 20], [-60, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateRight: "clamp",
  });
  const rackOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Right Receipt entrance
  const receiptX = interpolate(frame, [25, 45], [60, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateRight: "clamp",
  });
  const receiptOpacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Simulated 1-click Express check-in pulse
  const checkInSuccess = frame > 65;
  const pulseScale = interpolate(frame, [65, 75, 85], [1, 1.06, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0B1120",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: "40px",
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
      }}
    >
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h2
          style={{
            fontSize: "36px",
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
          }}
        >
          ইন্টেলিজেন্ট ফ্রন্ট ডেস্ক ও ইনস্ট্যান্ট ভাউচার
        </h2>
        <p style={{ fontSize: "16px", color: "#94A3B8", margin: "6px 0 0 0" }}>
          রিয়েলটাইম স্টে ভিউ, মাত্র ১ ক্লিকে এক্সপ্রেস চেক-ইন এবং ডুয়াল-কপি মানি রিসিপ্ট
        </p>
      </div>

      {/* Two Showcased Panels */}
      <div
        style={{
          display: "flex",
          gap: "28px",
          width: "1120px",
          justifyContent: "center",
        }}
      >
        {/* Panel 1: Interactive Stay View Rack */}
        <div
          style={{
            flex: 1.2,
            opacity: rackOpacity,
            translate: `${rackX}px 0px`,
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "20px",
            padding: "20px",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Rack Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              paddingBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>📅</span>
              <span style={{ color: "#F8FAFC", fontWeight: 700, fontSize: "15px" }}>
                Live Stay View Matrix
              </span>
            </div>
            <span
              style={{
                fontSize: "11px",
                color: "#10B981",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                padding: "3px 10px",
                borderRadius: "999px",
                fontWeight: 600,
              }}
            >
              ● Synchronized
            </span>
          </div>

          {/* Room Row 101 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(30, 41, 59, 0.7)",
              padding: "10px 14px",
              borderRadius: "12px",
              borderLeft: "4px solid #10B981",
            }}
          >
            <div>
              <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}>
                Room 101 · Deluxe King
              </div>
              <div style={{ color: "#94A3B8", fontSize: "12px" }}>Guest: Mr. Rahman (3 Nights)</div>
            </div>
            <span
              style={{
                fontSize: "12px",
                color: "#34D399",
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                padding: "4px 10px",
                borderRadius: "6px",
                fontWeight: 700,
              }}
            >
              Checked In
            </span>
          </div>

          {/* Room Row 102 (Animated 1-click Express check-in) */}
          <div
            style={{
              scale: `${pulseScale}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: checkInSuccess
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(30, 41, 59, 0.7)",
              padding: "10px 14px",
              borderRadius: "12px",
              borderLeft: `4px solid ${checkInSuccess ? "#10B981" : "#3B82F6"}`,
              border: checkInSuccess
                ? "1px solid rgba(16, 185, 129, 0.5)"
                : "1px solid rgba(255,255,255,0.05)",
              transition: "all 0.2s ease",
            }}
          >
            <div>
              <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}>
                Room 102 · Executive Sea View
              </div>
              <div style={{ color: "#94A3B8", fontSize: "12px" }}>
                Guest: Mrs. Farhana · Walk-in
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: checkInSuccess ? "#10B981" : "#2563EB",
                color: "#FFFFFF",
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "8px",
                fontWeight: 700,
                boxShadow: checkInSuccess
                  ? "0 0 15px rgba(16, 185, 129, 0.6)"
                  : "0 0 10px rgba(37, 99, 235, 0.4)",
              }}
            >
              <span>{checkInSuccess ? "✓ Express Checked In" : "⚡ 1-Click Check-In"}</span>
            </div>
          </div>

          {/* Room Row 201 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(30, 41, 59, 0.7)",
              padding: "10px 14px",
              borderRadius: "12px",
              borderLeft: "4px solid #F59E0B",
            }}
          >
            <div>
              <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}>
                Room 201 · Presidential Suite
              </div>
              <div style={{ color: "#94A3B8", fontSize: "12px" }}>Arriving: Booking.com OTA</div>
            </div>
            <span
              style={{
                fontSize: "12px",
                color: "#FBBF24",
                backgroundColor: "rgba(245, 158, 11, 0.2)",
                padding: "4px 10px",
                borderRadius: "6px",
                fontWeight: 700,
              }}
            >
              Reserved
            </span>
          </div>
        </div>

        {/* Panel 2: Dual Copy Money Receipt */}
        <div
          style={{
            flex: 0.9,
            opacity: receiptOpacity,
            translate: `${receiptX}px 0px`,
            backgroundColor: "#FFFFFF",
            borderRadius: "20px",
            padding: "20px",
            boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
            color: "#0F172A",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2px dashed #CBD5E1",
              paddingBottom: "10px",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: 900, color: "#1E293B" }}>
                GRAND PALACE RESORT
              </div>
              <div style={{ fontSize: "10px", color: "#64748B" }}>
                RECEIPT: MR-202611-0089
              </div>
            </div>
            <div
              style={{
                backgroundColor: "#DCFCE7",
                color: "#166534",
                fontWeight: 800,
                fontSize: "11px",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
            >
              PAID ৳ 25,000
            </div>
          </div>

          {/* Details */}
          <div style={{ fontSize: "11px", color: "#334155", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Guest Name:</span>
              <span style={{ fontWeight: 700 }}>Mrs. Farhana</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Room:</span>
              <span style={{ fontWeight: 700 }}>102 (Executive)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Payment Mode:</span>
              <span style={{ fontWeight: 700 }}>bKash Online Sync</span>
            </div>
          </div>

          {/* Perforated Divider */}
          <div
            style={{
              margin: "6px 0",
              borderBottom: "1px dashed #94A3B8",
              textAlign: "center",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "relative",
                top: "7px",
                backgroundColor: "#FFFFFF",
                padding: "0 8px",
                fontSize: "9px",
                color: "#94A3B8",
                fontWeight: 700,
              }}
            >
              ✂️ FOLD / PERFORATION LINE
            </span>
          </div>

          {/* Bottom Dual Half */}
          <div
            style={{
              backgroundColor: "#F8FAFC",
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              fontSize: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: "#1E293B" }}>ACCOUNTS OFFICE COPY</div>
              <div style={{ color: "#64748B" }}>Audit Stamp Verified ✓</div>
            </div>
            <div style={{ fontWeight: 800, color: "#0F172A", fontSize: "12px" }}>
              ৳ 25,000.00
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

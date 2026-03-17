import React from "react";
import {
  Img,
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { PHONE_ONBOARDING_SCENE_DURATIONS, TRANSITION_DURATION } from "./constants";
import { space } from "./design";
import { headlineFont, monoFont } from "./fonts";
import type { LaunchVideoProps } from "./types";

/* ── palette ─────────────────────────────────────── */

const c = {
  bg: "#faf9f7",
  card: "#ffffff",
  border: "#e4e4e7",
  soft: "#f4f4f5",
  text: "#18181b",
  muted: "#71717a",
  dim: "#a1a1aa",
  accent: "#c4613c",
  green: "#22c55e",
  greenSoft: "#dcfce7",
  sky: "#3b82f6",
  skySoft: "#dbeafe",
  tgBlue: "#0088cc",
  dark: "#18181b",
  darkMid: "#27272a",
  darkSoft: "#3f3f46",
};

/* ── animation primitives ────────────────────────── */

const pop = (frame: number, fps: number, delay = 0, dur = 22) =>
  spring({ frame: frame - delay, fps, durationInFrames: dur, config: { damping: 14, stiffness: 160 } });

const ease = (frame: number, a: number, b: number, from: number, to: number) =>
  interpolate(frame, [a, b], [from, to], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const cl = (frame: number, a: number, b: number, from: number, to: number) =>
  interpolate(frame, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/* ── floating turtle (background decoration) ─────── */

const FloatingTurtle: React.FC<{
  x: number;
  y: number;
  size?: number;
  delay?: number;
  rotation?: number;
  opacity?: number;
}> = ({ x, y, size = 64, delay = 0, rotation = 0, opacity = 0.12 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const floatY = Math.sin((frame - delay) * 0.06) * 10;
  const rot = Math.sin((frame - delay) * 0.04) * 4 + rotation;
  const s = pop(frame, fps, delay, 30);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        opacity: opacity * s,
        transform: `translateY(${floatY}px) rotate(${rot}deg) scale(${s})`,
        pointerEvents: "none",
      }}
    >
      <Img src={staticFile("robot-turtle.png")} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

/* ── pulsing dot ─────────────────────────────────── */

const Pulse: React.FC<{ color: string; size?: number }> = ({ color, size = 10 }) => {
  const frame = useCurrentFrame();
  const s = 1 + Math.sin(frame * 0.15) * 0.25;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: color,
        transform: `scale(${s})`,
        boxShadow: `0 0 ${size * 2}px ${color}55`,
        flexShrink: 0,
      }}
    />
  );
};

const TypingDots: React.FC<{ color?: string }> = ({ color = c.muted }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: space(1) }}>
      {[0, 1, 2].map((dot) => {
        const wave = Math.sin(frame * 0.22 - dot * 0.9);
        return (
          <div
            key={dot}
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: color,
              opacity: 0.35 + ((wave + 1) / 2) * 0.65,
              transform: `translateY(${-wave * 4}px)`,
            }}
          />
        );
      })}
    </div>
  );
};

/* ── base canvas ─────────────────────────────────── */

const Canvas: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <AbsoluteFill
    style={{
      background: dark
        ? "radial-gradient(circle at 40% 30%, #1a2332, #0f1720 60%, #080e14)"
        : c.bg,
      color: dark ? "#e8f4ff" : c.text,
      fontFamily: headlineFont,
      overflow: "hidden",
    }}
  >
    {!dark && (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 0%, rgba(196,97,60,0.05), transparent 40%), radial-gradient(circle at 80% 100%, rgba(59,130,246,0.04), transparent 30%)",
        }}
      />
    )}
    {children}
  </AbsoluteFill>
);

/* ═══════════════════════════════════════════════════
   SCENE 1 — HERO
   Big turtle, name, one-liner. Set the tone.
   ═══════════════════════════════════════════════════ */

const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoPop = pop(frame, fps, 0, 26);
  const namePop = pop(frame, fps, 8);
  const tagPop = pop(frame, fps, 18);

  return (
    <Canvas>
      <FloatingTurtle x={40} y={120} size={44} delay={10} rotation={-14} opacity={0.08} />
      <FloatingTurtle x={940} y={180} size={36} delay={20} rotation={10} opacity={0.06} />
      <FloatingTurtle x={80} y={1660} size={38} delay={30} rotation={18} opacity={0.06} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 0,
          padding: `0 ${space(8)}px`,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 36,
            background: c.card,
            border: `1px solid ${c.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 16px 48px rgba(0,0,0,0.08)",
            transform: `scale(${logoPop})`,
            marginBottom: space(4),
          }}
        >
          <Img src={staticFile("robot-turtle.png")} style={{ width: 90, height: 90 }} />
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -2,
            opacity: namePop,
            transform: `translateY(${(1 - namePop) * 16}px)`,
          }}
        >
          SuperTurtle
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: space(2),
            fontSize: 30,
            color: c.muted,
            fontWeight: 500,
            opacity: tagPop,
            transform: `translateY(${(1 - tagPop) * 12}px)`,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Your coding agent on Telegram.
          <br />
          Runs in the cloud. Controlled from your phone.
        </div>
      </div>
    </Canvas>
  );
};

/* ═══════════════════════════════════════════════════
   SCENE 2 — THE MOMENT (Telegram chat)
   This IS the product. User sends a message,
   agent streams back a real response.
   ═══════════════════════════════════════════════════ */

const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Timing
  const userMsgAppear = 8;
  const typingStart = 24;
  const replyStart = 40;
  const codeBlockStart = 66;
  const statusStart = 96;

  // Streaming reply text
  const replyFull = "On it. I'm scaffolding the hero, features, and pricing sections now.";
  const replyChars = Math.max(0, Math.floor((frame - replyStart) * 1.55));
  const replyText = replyFull.slice(0, replyChars);
  const typingActive = frame >= typingStart && frame < replyStart;
  const headerStatusColor = typingActive ? c.tgBlue : c.green;
  const headerStatusText = typingActive ? "typing..." : "online";

  // Streaming code
  const codeLines = [
    "src/app/page.tsx",
    "src/components/Hero.tsx",
    "src/components/Features.tsx",
    "tailwind.config.ts",
  ];
  const codeProgress = Math.max(0, Math.floor((frame - codeBlockStart) / 8));

  return (
    <Canvas>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(232,244,255,0.92) 0%, rgba(248,251,255,0.98) 54%, rgba(243,246,250,1) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.32,
          backgroundImage:
            "radial-gradient(rgba(59,130,246,0.14) 1.5px, transparent 1.5px), radial-gradient(rgba(196,97,60,0.08) 1px, transparent 1px)",
          backgroundPosition: "0 0, 16px 16px",
          backgroundSize: "32px 32px",
        }}
      />
      <FloatingTurtle x={920} y={100} size={40} delay={8} rotation={12} opacity={0.07} />
      <FloatingTurtle x={50} y={1640} size={36} delay={16} rotation={-10} opacity={0.06} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: `${space(8)}px ${space(4)}px ${space(6)}px`,
        }}
      >
        {/* Chat header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space(2),
            padding: `${space(2)}px ${space(3)}px`,
            marginBottom: space(4),
            borderRadius: 28,
            background: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(255,255,255,0.72)",
            boxShadow: "0 12px 36px rgba(17,24,39,0.06)",
            opacity: cl(frame, 0, 8, 0, 1),
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              background: c.soft,
              border: `1px solid ${c.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Img src={staticFile("robot-turtle.png")} style={{ width: 30, height: 30 }} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>SuperTurtle</div>
            <div
              style={{
                fontSize: 15,
                color: headerStatusColor,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: space(1),
              }}
            >
              <Pulse color={headerStatusColor} size={6} />
              {headerStatusText}
            </div>
          </div>
        </div>

        {/* Chat thread */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: `0 ${space(1)}px`,
          }}
        >
          <div
            style={{
              alignSelf: "center",
              marginBottom: space(3),
              padding: `${space(1)}px ${space(2)}px`,
              borderRadius: 999,
              background: "rgba(255,255,255,0.84)",
              border: `1px solid ${c.border}`,
              color: c.muted,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 0.2,
              opacity: cl(frame, 2, 10, 0, 1),
            }}
          >
            Today
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: space(3),
            }}
          >
            {/* User message — right aligned, blue */}
            <div
              style={{
                alignSelf: "flex-end",
                maxWidth: "78%",
                opacity: cl(frame, userMsgAppear, userMsgAppear + 8, 0, 1),
                transform: `translateY(${ease(frame, userMsgAppear, userMsgAppear + 10, 20, 0)}px)`,
              }}
            >
              <div
                style={{
                  background: "linear-gradient(180deg, #2aabee 0%, #1d9dd9 100%)",
                  color: "#fff",
                  borderRadius: "26px 26px 10px 26px",
                  padding: `${space(2)}px ${space(3)}px`,
                  fontSize: 22,
                  lineHeight: 1.38,
                  fontWeight: 500,
                  display: "flex",
                  flexDirection: "column",
                  gap: space(1),
                  boxShadow: "0 10px 24px rgba(29,157,217,0.18)",
                }}
              >
                <div>Build me a landing page for SuperTurtle with hero, features, and pricing.</div>
                <div
                  style={{
                    alignSelf: "flex-end",
                    display: "flex",
                    alignItems: "center",
                    gap: space(1),
                    fontSize: 13,
                    color: "rgba(255,255,255,0.74)",
                    fontWeight: 600,
                  }}
                >
                  <span>9:41 AM</span>
                  <span style={{ letterSpacing: -1 }}>✓✓</span>
                </div>
              </div>
            </div>

            {/* Typing indicator */}
            {typingActive && (
              <div
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "36%",
                  opacity:
                    cl(frame, typingStart, typingStart + 6, 0, 1) *
                    cl(frame, replyStart - 4, replyStart, 1, 0),
                  transform: `translateY(${ease(frame, typingStart, typingStart + 10, 16, 0)}px)`,
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.94)",
                    border: `1px solid ${c.border}`,
                    borderRadius: "26px 26px 26px 10px",
                    padding: `${space(2)}px ${space(3)}px`,
                    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                  }}
                >
                  <TypingDots color="#90a4b8" />
                </div>
              </div>
            )}

            {/* Bot reply — left aligned, white */}
            <div
              style={{
                alignSelf: "flex-start",
                maxWidth: "84%",
                opacity: cl(frame, replyStart, replyStart + 6, 0, 1),
                transform: `translateY(${ease(frame, replyStart, replyStart + 10, 18, 0)}px)`,
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.96)",
                  border: `1px solid ${c.border}`,
                  borderRadius: "26px 26px 26px 10px",
                  padding: `${space(2)}px ${space(3)}px`,
                  boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  gap: space(2),
                }}
              >
                {/* Streaming text */}
                <div style={{ fontSize: 21, lineHeight: 1.45, color: c.text, minHeight: 62 }}>
                  {replyText}
                  {replyChars < replyFull.length && (
                    <span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0, color: c.accent }}>|</span>
                  )}
                </div>

                {/* Code file list — appears after text */}
                {frame >= codeBlockStart && (
                  <div
                    style={{
                      borderRadius: 18,
                      background: "#111827",
                      padding: `${space(2)}px ${space(3)}px`,
                      opacity: cl(frame, codeBlockStart, codeBlockStart + 8, 0, 1),
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {codeLines.slice(0, codeProgress).map((line, i) => (
                      <div
                        key={line}
                        style={{
                          fontFamily: monoFont,
                          fontSize: 16,
                          color: i < codeProgress - 1 ? c.green : "#cbd5e1",
                          lineHeight: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: space(1),
                          opacity: cl(frame, codeBlockStart + i * 8, codeBlockStart + i * 8 + 6, 0, 1),
                        }}
                      >
                        <span style={{ color: i < codeProgress - 1 ? c.green : "#64748b" }}>
                          {i < codeProgress - 1 ? "✓" : "▸"}
                        </span>
                        {line}
                      </div>
                    ))}
                  </div>
                )}

                {/* Status badge */}
                {frame >= statusStart && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: space(1),
                      opacity: cl(frame, statusStart, statusStart + 8, 0, 1),
                    }}
                  >
                    <Pulse color={c.green} size={8} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: c.green }}>4 files created</span>
                    <span style={{ fontSize: 15, color: c.dim }}>in 12s</span>
                  </div>
                )}

                <div
                  style={{
                    alignSelf: "flex-end",
                    display: "flex",
                    alignItems: "center",
                    gap: space(1),
                    fontSize: 13,
                    color: c.dim,
                    fontWeight: 600,
                  }}
                >
                  <span>9:42 AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Canvas>
  );
};

/* ═══════════════════════════════════════════════════
   SCENE 3 — ARCHITECTURE
   Phone → Telegram → Cloud → Code
   Clean animated diagram. Show what's happening.
   ═══════════════════════════════════════════════════ */

const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const nodes = [
    { icon: "📱", label: "You", delay: 4, y: 0 },
    { icon: "✈️", label: "Telegram", delay: 12, y: 0 },
    { icon: "☁️", label: "Cloud Sandbox", delay: 20, y: 0 },
    { icon: "🐢", label: "Agent", delay: 28, y: 0 },
  ];

  // Data flow pulse
  const flowPhase = (frame - 40) * 0.04;
  const flowActive = frame > 40;

  return (
    <Canvas dark>
      <FloatingTurtle x={50} y={100} size={42} delay={6} rotation={-10} opacity={0.06} />
      <FloatingTurtle x={940} y={1640} size={36} delay={18} rotation={14} opacity={0.05} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: `0 ${space(6)}px`,
          gap: space(6),
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: -1.4,
            opacity: cl(frame, 0, 10, 0, 1),
            textAlign: "center",
          }}
        >
          How it works
        </div>

        {/* Vertical node chain */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "100%" }}>
          {nodes.map((node, i) => {
            const p = pop(frame, fps, node.delay);
            const isLast = i === nodes.length - 1;
            return (
              <React.Fragment key={node.label}>
                {/* Node */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: space(3),
                    width: space(54),
                    opacity: p,
                    transform: `translateX(${(1 - p) * (i % 2 === 0 ? -30 : 30)}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 20,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 34,
                      flexShrink: 0,
                    }}
                  >
                    {node.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{node.label}</div>
                  </div>
                </div>

                {/* Connector line between nodes */}
                {!isLast && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      width: space(54),
                      paddingLeft: space(3),
                    }}
                  >
                    <div
                      style={{
                        width: 3,
                        height: 48,
                        background: flowActive
                          ? `linear-gradient(180deg, rgba(59,130,246,${0.3 + Math.sin(flowPhase + i * 1.5) * 0.3}), rgba(34,197,94,${0.3 + Math.sin(flowPhase + i * 1.5 + 1) * 0.3}))`
                          : "rgba(255,255,255,0.08)",
                        borderRadius: 999,
                        position: "relative",
                        overflow: "visible",
                      }}
                    >
                      {/* Traveling dot */}
                      {flowActive && (
                        <div
                          style={{
                            position: "absolute",
                            left: -4,
                            top: `${((Math.sin(flowPhase + i * 1.8) + 1) / 2) * 100}%`,
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: c.sky,
                            boxShadow: `0 0 12px ${c.sky}88`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(232,244,255,0.5)",
            fontWeight: 500,
            textAlign: "center",
            lineHeight: 1.5,
            opacity: cl(frame, 36, 46, 0, 1),
          }}
        >
          You message on Telegram.
          <br />
          The agent codes in a cloud sandbox.
        </div>
      </div>
    </Canvas>
  );
};

/* ═══════════════════════════════════════════════════
   SCENE 4 — TELEPORT
   The differentiator. Local fades → cloud lights up →
   Telegram stays connected.
   ═══════════════════════════════════════════════════ */

const TeleportScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = cl(frame, 16, 56, 0, 1);
  const localOp = 1 - progress * 0.7;
  const cloudOp = 0.3 + progress * 0.7;
  const beamGlow = cl(frame, 30, 50, 0, 1);

  return (
    <Canvas>
      <FloatingTurtle x={50} y={100} size={46} delay={4} rotation={-8} opacity={0.08} />
      <FloatingTurtle x={920} y={1600} size={38} delay={16} rotation={16} opacity={0.06} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: `0 ${space(6)}px`,
          gap: space(5),
        }}
      >
        {/* Command badge */}
        <div
          style={{
            fontFamily: monoFont,
            fontSize: 26,
            fontWeight: 600,
            color: c.accent,
            background: "#f6dfd6",
            padding: `${space(1)}px ${space(3)}px`,
            borderRadius: 999,
            opacity: pop(frame, fps, 0),
            transform: `scale(${pop(frame, fps, 0)})`,
          }}
        >
          /teleport
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 46,
            fontWeight: 700,
            letterSpacing: -1.4,
            textAlign: "center",
            lineHeight: 1.15,
            opacity: cl(frame, 4, 14, 0, 1),
          }}
        >
          Move to the cloud.
          <br />
          <span style={{ color: c.muted }}>Stay on Telegram.</span>
        </div>

        {/* Diagram: Local ← beam → Cloud, Telegram below */}
        <div
          style={{
            width: "100%",
            borderRadius: 28,
            background: c.card,
            border: `1px solid ${c.border}`,
            padding: `${space(5)}px ${space(4)}px`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.05)",
          }}
        >
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {/* Local */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: space(1),
                opacity: localOp,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: c.soft,
                  border: `2px solid ${progress < 0.5 ? c.sky : c.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                }}
              >
                💻
              </div>
              <span style={{ fontWeight: 700, fontSize: 18 }}>Your PC</span>
            </div>

            {/* Beam */}
            <div style={{ flex: 1, position: "relative", height: 6 }}>
              <div style={{ width: "100%", height: 6, borderRadius: 999, background: c.soft }}>
                <div
                  style={{
                    height: "100%",
                    width: `${progress * 100}%`,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${c.sky}, ${c.green})`,
                    boxShadow: beamGlow > 0.5 ? `0 0 16px ${c.green}44` : "none",
                  }}
                />
              </div>
              {/* Traveling dot */}
              <div
                style={{
                  position: "absolute",
                  left: `${progress * 100}%`,
                  top: -5,
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: c.green,
                  transform: "translateX(-50%)",
                  boxShadow: `0 0 16px ${c.green}66`,
                  opacity: progress > 0.02 && progress < 0.98 ? 1 : 0,
                }}
              />
            </div>

            {/* Cloud */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: space(1),
                opacity: cloudOp,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: progress > 0.5 ? c.greenSoft : c.soft,
                  border: `2px solid ${progress > 0.5 ? c.green : c.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                }}
              >
                ☁️
              </div>
              <span style={{ fontWeight: 700, fontSize: 18 }}>E2B Sandbox</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: c.border, margin: `${space(4)}px 0` }} />

          {/* Telegram — stays connected */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: space(2) }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: `${c.tgBlue}12`,
                border: `1px solid ${c.tgBlue}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
              }}
            >
              ✈️
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Telegram</div>
              <div
                style={{
                  fontSize: 15,
                  color: c.green,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: space(1),
                }}
              >
                <Pulse color={c.green} size={6} />
                Always connected
              </div>
            </div>
          </div>
        </div>

        {/* One-liner */}
        <div
          style={{
            fontSize: 20,
            color: c.muted,
            textAlign: "center",
            fontWeight: 500,
            opacity: cl(frame, 60, 72, 0, 1),
          }}
        >
          One command. Zero downtime.
        </div>
      </div>
    </Canvas>
  );
};

/* ═══════════════════════════════════════════════════
   SCENE 5 — CLOSE
   Turtle, tagline, CTA.
   ═══════════════════════════════════════════════════ */

const CloseScene: React.FC<Pick<LaunchVideoProps, "cta">> = ({ cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tPop = pop(frame, fps, 0, 24);
  const tagPop = pop(frame, fps, 10);

  return (
    <Canvas>
      <FloatingTurtle x={30} y={100} size={56} delay={0} rotation={-14} opacity={0.12} />
      <FloatingTurtle x={920} y={140} size={46} delay={6} rotation={10} opacity={0.1} />
      <FloatingTurtle x={60} y={1600} size={40} delay={12} rotation={18} opacity={0.08} />
      <FloatingTurtle x={900} y={1640} size={44} delay={18} rotation={-12} opacity={0.08} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 0,
          padding: `0 ${space(8)}px`,
        }}
      >
        {/* Big turtle */}
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: 999,
            background: c.greenSoft,
            border: `3px solid ${c.green}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${tPop})`,
            boxShadow: "0 16px 48px rgba(34,197,94,0.2)",
            marginBottom: space(4),
          }}
        >
          <Img src={staticFile("robot-turtle.png")} style={{ width: 82, height: 82 }} />
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 50,
            fontWeight: 700,
            letterSpacing: -1.6,
            textAlign: "center",
            lineHeight: 1.15,
            opacity: tagPop,
            transform: `translateY(${(1 - tagPop) * 16}px)`,
          }}
        >
          {cta}
        </div>

        {/* Three proof points */}
        <div
          style={{
            marginTop: space(4),
            display: "flex",
            gap: space(3),
            justifyContent: "center",
          }}
        >
          {[
            { label: "Telegram", delay: 16 },
            { label: "Cloud", delay: 20 },
            { label: "Autonomous", delay: 24 },
          ].map(({ label, delay }) => {
            const p = pop(frame, fps, delay);
            return (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: space(1),
                  opacity: p,
                  transform: `scale(${p})`,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    background: c.green,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 700,
                    boxShadow: `0 4px 12px ${c.green}44`,
                  }}
                >
                  ✓
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: c.muted }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: space(5),
            width: "80%",
            height: space(8),
            borderRadius: 16,
            background: c.accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            boxShadow: "0 6px 24px rgba(196,97,60,0.3)",
            opacity: cl(frame, 30, 38, 0, 1),
            transform: `translateY(${cl(frame, 30, 38, 12, 0)}px)`,
          }}
        >
          Get started
        </div>
      </div>
    </Canvas>
  );
};

/* ═══════════════════════════════════════════════════
   COMPOSITION
   ═══════════════════════════════════════════════════ */

export const PhoneLaunchVideo: React.FC<LaunchVideoProps> = (props) => {
  const D = PHONE_ONBOARDING_SCENE_DURATIONS;
  return (
    <AbsoluteFill style={{ fontFamily: headlineFont }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D.hero}>
          <HeroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={D.chat}>
          <ChatScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={D.architecture}>
          <ArchitectureScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={D.teleport}>
          <TeleportScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={D.close}>
          <CloseScene cta={props.cta} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

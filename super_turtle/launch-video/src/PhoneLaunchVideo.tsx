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
  const { fps } = useVideoConfig();

  // Timing
  const userMsgAppear = 6;
  const replyStart = 22;
  const codeBlockStart = 50;
  const statusStart = 82;

  // Streaming reply text
  const replyFull = "Setting up the project structure and building your landing page...";
  const replyChars = Math.max(0, Math.floor((frame - replyStart) * 0.7));
  const replyText = replyFull.slice(0, replyChars);

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
      <FloatingTurtle x={920} y={100} size={40} delay={8} rotation={12} opacity={0.07} />
      <FloatingTurtle x={50} y={1640} size={36} delay={16} rotation={-10} opacity={0.06} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: `${space(10)}px ${space(6)}px ${space(8)}px`,
        }}
      >
        {/* Chat header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space(2),
            marginBottom: space(4),
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
                fontSize: 14,
                color: c.green,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: space(1),
              }}
            >
              <Pulse color={c.green} size={6} />
              Online
            </div>
          </div>
        </div>

        {/* Chat thread */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: space(2), justifyContent: "center" }}>
          {/* User message — right aligned, blue */}
          <div
            style={{
              alignSelf: "flex-end",
              maxWidth: "82%",
              opacity: cl(frame, userMsgAppear, userMsgAppear + 8, 0, 1),
              transform: `translateY(${ease(frame, userMsgAppear, userMsgAppear + 10, 16, 0)}px)`,
            }}
          >
            <div
              style={{
                background: c.tgBlue,
                color: "#fff",
                borderRadius: "22px 22px 4px 22px",
                padding: `${space(2)}px ${space(3)}px`,
                fontSize: 22,
                lineHeight: 1.4,
                fontWeight: 500,
              }}
            >
              Build me a landing page for SuperTurtle with hero, features section, and pricing
            </div>
            <div style={{ textAlign: "right", marginTop: space(1), fontSize: 13, color: c.dim }}>
              You
            </div>
          </div>

          {/* Bot reply — left aligned, white */}
          <div
            style={{
              alignSelf: "flex-start",
              maxWidth: "88%",
              opacity: cl(frame, replyStart - 2, replyStart + 6, 0, 1),
              transform: `translateY(${ease(frame, replyStart - 2, replyStart + 8, 16, 0)}px)`,
            }}
          >
            <div
              style={{
                background: c.card,
                border: `1px solid ${c.border}`,
                borderRadius: "22px 22px 22px 4px",
                padding: `${space(2)}px ${space(3)}px`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {/* Streaming text */}
              <div style={{ fontSize: 21, lineHeight: 1.45, color: c.text, minHeight: 30 }}>
                {replyText}
                {replyChars < replyFull.length && (
                  <span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0, color: c.accent }}>|</span>
                )}
              </div>

              {/* Code file list — appears after text */}
              {frame >= codeBlockStart && (
                <div
                  style={{
                    marginTop: space(2),
                    borderRadius: 14,
                    background: c.dark,
                    padding: `${space(2)}px ${space(3)}px`,
                    opacity: cl(frame, codeBlockStart, codeBlockStart + 8, 0, 1),
                  }}
                >
                  {codeLines.slice(0, codeProgress).map((line, i) => (
                    <div
                      key={line}
                      style={{
                        fontFamily: monoFont,
                        fontSize: 16,
                        color: i < codeProgress - 1 ? c.green : "#a1a1aa",
                        lineHeight: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: space(1),
                        opacity: cl(frame, codeBlockStart + i * 8, codeBlockStart + i * 8 + 6, 0, 1),
                      }}
                    >
                      <span style={{ color: i < codeProgress - 1 ? c.green : c.dim }}>
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
                    marginTop: space(2),
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
            </div>
            <div
              style={{
                marginTop: space(1),
                fontSize: 13,
                color: c.dim,
                display: "flex",
                alignItems: "center",
                gap: space(1),
              }}
            >
              <Img src={staticFile("robot-turtle.png")} style={{ width: 16, height: 16 }} />
              SuperTurtle
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

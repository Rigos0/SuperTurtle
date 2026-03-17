import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { reveal, smoothStep } from "./animations";
import { monoFont } from "./fonts";
import { palette } from "./design";

export const SceneShell: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at top left, rgba(118, 247, 191, 0.14), transparent 28%), radial-gradient(circle at 80% 20%, rgba(59, 184, 255, 0.24), transparent 24%), linear-gradient(145deg, ${palette.ink} 0%, ${palette.night} 46%, #050b12 100%)`,
        color: palette.text,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 28,
          border: `1px solid ${palette.line}`,
          borderRadius: 30,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 120], [0, -120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "extend",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: -120,
        opacity: 0.09,
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.9) 0.8px, transparent 0.8px)",
        backgroundSize: "20px 20px",
        transform: `translate(${drift}px, ${-drift * 0.6}px)`,
      }}
    />
  );
};

export const TitleBlock: React.FC<{
  eyebrow: string;
  title: string;
  body: string;
}> = ({ eyebrow, title, body }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = smoothStep(frame, [0, 16], [0, 1]);
  const lift = smoothStep(frame, [0, 20], [38, 0]);
  const accentScale = reveal(frame, fps, 8, 28);

  return (
    <div
      style={{
        position: "absolute",
        top: 120,
        left: 120,
        width: 760,
        opacity,
        transform: `translateY(${lift}px)`,
      }}
    >
      <div
        style={{
          marginBottom: 18,
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          borderRadius: 999,
          background: "rgba(118, 247, 191, 0.09)",
          border: `1px solid ${palette.line}`,
          color: palette.mint,
          fontFamily: monoFont,
          fontSize: 24,
          letterSpacing: 1.8,
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: palette.mint,
            transform: `scale(${0.75 + accentScale * 0.25})`,
          }}
        />
        {eyebrow}
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: 110,
          lineHeight: 0.94,
          fontWeight: 700,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          marginTop: 28,
          marginBottom: 0,
          color: palette.muted,
          fontSize: 34,
          lineHeight: 1.35,
        }}
      >
        {body}
      </p>
    </div>
  );
};

export const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(22, 48, 71, 0.92), rgba(10, 23, 35, 0.92))",
        border: `1px solid ${palette.line}`,
        boxShadow: "0 28px 80px rgba(0, 0, 0, 0.32)",
        borderRadius: 28,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const MessageBubble: React.FC<{
  command: string;
  body: string;
  accent?: string;
}> = ({ command, body, accent = palette.sky }) => {
  return (
    <GlassCard
      style={{
        padding: "26px 28px",
        width: 510,
      }}
    >
      <div
        style={{
          color: accent,
          fontFamily: monoFont,
          fontSize: 32,
          marginBottom: 16,
        }}
      >
        {command}
      </div>
      <div
        style={{
          fontSize: 32,
          lineHeight: 1.35,
          color: palette.text,
        }}
      >
        {body}
      </div>
    </GlassCard>
  );
};

export const ProgressRail: React.FC<{
  steps: Array<{ label: string; active?: boolean; done?: boolean }>;
}> = ({ steps }) => {
  return (
    <GlassCard
      style={{
        padding: "30px 34px",
        width: 560,
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      {steps.map((step) => (
        <div
          key={step.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            color: step.active ? palette.text : palette.muted,
            fontSize: 28,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: step.done ? palette.mint : step.active ? palette.sky : "rgba(255,255,255,0.15)",
              boxShadow: step.active ? `0 0 24px ${palette.glow}` : "none",
            }}
          />
          <span>{step.label}</span>
        </div>
      ))}
    </GlassCard>
  );
};

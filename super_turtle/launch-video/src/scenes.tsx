import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { reveal, smoothStep } from "./animations";
import { GlassCard, Grain, MessageBubble, ProgressRail, SceneShell, TitleBlock } from "./components";
import { palette } from "./design";
import { monoFont } from "./fonts";
import type { LaunchVideoProps } from "./types";

const Node: React.FC<{
  label: string;
  sublabel: string;
  active?: boolean;
  x: number;
  y: number;
}> = ({ label, sublabel, active = false, x, y }) => {
  return (
    <GlassCard
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 290,
        padding: "24px 26px",
        borderColor: active ? "rgba(118, 247, 191, 0.34)" : undefined,
      }}
    >
      <div
        style={{
          color: active ? palette.mint : palette.sky,
          fontFamily: monoFont,
          fontSize: 22,
          marginBottom: 14,
          textTransform: "uppercase",
          letterSpacing: 1.4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 34, fontWeight: 600, marginBottom: 10 }}>{sublabel}</div>
      <div style={{ color: palette.muted, fontSize: 24 }}>Current runtime owner</div>
    </GlassCard>
  );
};

const Connector: React.FC<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
}> = ({ fromX, fromY, toX, toY, progress }) => {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const distance = Math.sqrt(dx * dx + dy * dy);

  return (
    <div
      style={{
        position: "absolute",
        left: fromX,
        top: fromY,
        width: distance * progress,
        height: 4,
        borderRadius: 999,
        transformOrigin: "left center",
        transform: `rotate(${angle}deg)`,
        background: `linear-gradient(90deg, ${palette.sky}, ${palette.mint})`,
        boxShadow: `0 0 24px ${palette.glow}`,
      }}
    />
  );
};

export const IntroScene: React.FC<LaunchVideoProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const heroScale = 0.94 + reveal(frame, fps, 4, 34) * 0.06;
  const orbit = smoothStep(frame, [0, 70], [26, 0]);

  return (
    <SceneShell>
      <Grain />
      <TitleBlock eyebrow="Telegram-native agent" title={title} body={subtitle} />
      <GlassCard
        style={{
          position: "absolute",
          right: 120,
          top: 138,
          width: 720,
          height: 760,
          padding: 38,
          transform: `scale(${heroScale})`,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 22,
            height: "100%",
          }}
        >
          <MessageBubble command="/build X" body="User asks from Telegram. SuperTurtle decomposes and responds live." />
          <MessageBubble command="Streaming" body="Replies, tools, buttons, and model actions stay in the chat." accent={palette.mint} />
          <MessageBubble command="SubTurtles" body="Parallel workers execute concrete tasks with auditable state." accent={palette.coral} />
          <GlassCard
            style={{
              padding: "26px 28px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ color: palette.sky, fontFamily: monoFont, fontSize: 32, marginBottom: 18 }}>
              Current flow
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 28, color: palette.text }}>
              <span style={{ transform: `translateX(${orbit}px)` }}>local turtle on your PC</span>
              <span style={{ transform: `translateX(${-orbit}px)` }}>/teleport to E2B</span>
              <span style={{ transform: `translateX(${orbit}px)` }}>webhook cutover after health check</span>
              <span style={{ transform: `translateX(${-orbit}px)` }}>/home back to local polling</span>
            </div>
          </GlassCard>
        </div>
      </GlassCard>
    </SceneShell>
  );
};

export const TeleportScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const railProgress = reveal(frame, fps, 10, 28);
  const messageY = smoothStep(frame, [0, 20], [50, 0]);

  return (
    <SceneShell>
      <Grain />
      <TitleBlock
        eyebrow="Step 1"
        title="Teleport starts the remote runtime."
        body="The current branch is explicit about the contract: local polling stays authoritative until the E2B webhook runtime is actually healthy."
      />
      <div
        style={{
          position: "absolute",
          left: 122,
          bottom: 132,
          transform: `translateY(${messageY}px)`,
        }}
      >
        <MessageBubble
          command="/teleport"
          body="Launch or reuse one E2B sandbox, wait for readiness, then cut Telegram over."
        />
      </div>
      <div
        style={{
          position: "absolute",
          right: 140,
          top: 190,
          opacity: 0.35 + railProgress * 0.65,
        }}
      >
        <ProgressRail
          steps={[
            { label: "Prepare local ownership state", done: frame > 12 },
            { label: "Start or resume E2B sandbox", active: frame > 20 && frame <= 40, done: frame > 40 },
            { label: "Write runtime state and auth", active: frame > 40 && frame <= 58, done: frame > 58 },
            { label: "Verify remote webhook readiness", active: frame > 58 && frame <= 76, done: frame > 76 },
            { label: "Switch Telegram ownership", active: frame > 76, done: frame > 88 },
          ]}
        />
      </div>
    </SceneShell>
  );
};

export const CutoverScene: React.FC<Pick<LaunchVideoProps, "remoteLabel">> = ({ remoteLabel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = reveal(frame, fps, 8, 34);
  const badgeOpacity = interpolate(frame, [28, 56], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneShell>
      <Grain />
      <TitleBlock
        eyebrow="Step 2"
        title="Cut over only after the webhook is healthy."
        body="The video should sell reliability, not just cloud novelty. This scene visualizes the health-check gate and Telegram ownership handoff."
      />
      <Node label="Local" sublabel="Long polling on your PC" x={1080} y={230} active={frame < 48} />
      <Node label="Remote" sublabel={remoteLabel} x={1490} y={230} active={frame >= 48} />
      <Node label="Telegram" sublabel="Ownership target" x={1286} y={620} active />
      <Connector fromX={1360} fromY={390} toX={1490} toY={390} progress={progress} />
      <Connector fromX={1520} fromY={520} toX={1438} toY={620} progress={progress} />
      <div
        style={{
          position: "absolute",
          left: 1306,
          top: 470,
          opacity: badgeOpacity,
          padding: "12px 18px",
          borderRadius: 999,
          background: "rgba(118, 247, 191, 0.12)",
          border: `1px solid ${palette.line}`,
          color: palette.mint,
          fontFamily: monoFont,
          fontSize: 24,
        }}
      >
        healthz OK / readyz OK
      </div>
    </SceneShell>
  );
};

export const RemoteScene: React.FC<Pick<LaunchVideoProps, "remoteLabel">> = ({ remoteLabel }) => {
  const frame = useCurrentFrame();
  const leftIn = smoothStep(frame, [0, 20], [50, 0]);
  const rightIn = smoothStep(frame, [6, 28], [60, 0]);

  return (
    <SceneShell>
      <Grain />
      <TitleBlock
        eyebrow="Step 3"
        title="The remote turtle keeps working in chat."
        body="Once ownership flips, the sandbox handles Telegram updates directly and continues the same control surface: messages, tools, and driver-led coding work."
      />
      <GlassCard
        style={{
          position: "absolute",
          left: 120,
          bottom: 132,
          width: 700,
          padding: 32,
          transform: `translateY(${leftIn}px)`,
        }}
      >
        <div style={{ color: palette.sky, fontFamily: monoFont, fontSize: 28, marginBottom: 18 }}>
          {remoteLabel}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MessageBubble command="Driver" body="Codex-first remote runtime with sandbox-local bootstrap." accent={palette.mint} />
          <MessageBubble command="Surface" body="Text chat plus control commands already work on the remote runtime." accent={palette.coral} />
        </div>
      </GlassCard>
      <GlassCard
        style={{
          position: "absolute",
          right: 120,
          top: 228,
          width: 720,
          padding: 34,
          transform: `translateY(${rightIn}px)`,
        }}
      >
        <div style={{ color: palette.sky, fontFamily: monoFont, fontSize: 28, marginBottom: 20 }}>
          Live response
        </div>
        <div
          style={{
            borderRadius: 22,
            border: `1px solid ${palette.line}`,
            background: "rgba(9, 20, 31, 0.72)",
            padding: 26,
            fontSize: 30,
            lineHeight: 1.4,
          }}
        >
          <div style={{ color: palette.mint, marginBottom: 12 }}>Streaming Codex reply</div>
          <div style={{ color: palette.muted }}>
            Parallel workers run, tools report back, and the conversation stays in Telegram while the compute lives in E2B.
          </div>
        </div>
      </GlassCard>
    </SceneShell>
  );
};

export const HomeScene: React.FC<Pick<LaunchVideoProps, "cta">> = ({ cta }) => {
  const frame = useCurrentFrame();
  const pulse = 1 + reveal(frame, 30, 18, 32) * 0.04;

  return (
    <SceneShell>
      <Grain />
      <TitleBlock
        eyebrow="Step 4"
        title="Return home when you want local ownership back."
        body="The end of the video closes the loop: `/home` deletes the webhook, hands Telegram back to local polling, and keeps repeat teleport cycles fast."
      />
      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 148,
        }}
      >
        <MessageBubble command="/home" body="Release Telegram, pause the sandbox, route control back to your PC." accent={palette.coral} />
      </div>
      <GlassCard
        style={{
          position: "absolute",
          right: 120,
          bottom: 148,
          width: 720,
          padding: "42px 46px",
        }}
      >
        <div style={{ color: palette.muted, fontFamily: monoFont, fontSize: 24, marginBottom: 18 }}>
          Launch close
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 0.96,
            marginBottom: 24,
            transform: `scale(${pulse})`,
            transformOrigin: "left center",
          }}
        >
          {cta}
        </div>
        <div style={{ color: palette.muted, fontSize: 30, lineHeight: 1.35 }}>
          Telegram-native control. Reliable handoff. Remote power when you need it.
        </div>
      </GlassCard>
    </SceneShell>
  );
};

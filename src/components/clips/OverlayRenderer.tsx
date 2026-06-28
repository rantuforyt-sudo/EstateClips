"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types mirrored from overlay-generator.ts ─────────────────────────────────
interface OverlayData {
  type: string;
  content: Record<string, string | number | boolean>;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  startTime: number;
  endTime: number;
  animation: string;
  animDuration: number;
  style: string;
  zIndex: number;
}

interface OverlayRendererProps {
  overlays: OverlayData[];
  currentTime: number;
  /** Template primary color */
  primaryColor?: string;
  /** Template secondary color */
  secondaryColor?: string;
  /** Container aspect ratio (for positioning) */
  aspectRatio?: "16:9" | "9:16";
}

// ─── Animation presets ────────────────────────────────────────────────────────
const ANIMATIONS = {
  fade_in: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  slide_up: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
  },
  slide_down: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  scale_in: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  none: { initial: {}, animate: {}, exit: {} },
};

function getAnim(animation: string) {
  return ANIMATIONS[animation as keyof typeof ANIMATIONS] ?? ANIMATIONS.fade_in;
}

// ─── Individual overlay renderers ─────────────────────────────────────────────

function HookText({ content, primaryColor }: { content: Record<string, string | number | boolean>; primaryColor: string }) {
  return (
    <div className="text-center px-4">
      <p
        className="text-white font-black leading-tight tracking-tight drop-shadow-2xl"
        style={{
          fontSize: "clamp(1.1rem, 4vw, 2rem)",
          textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.6)",
        }}
      >
        {String(content.text ?? "")}
      </p>
      {content.subtext && (
        <p
          className="text-white/70 font-medium mt-1"
          style={{ fontSize: "clamp(0.7rem, 2vw, 1rem)" }}
        >
          {String(content.subtext)}
        </p>
      )}
    </div>
  );
}

function LowerThird({
  content,
  style,
  primaryColor,
}: {
  content: Record<string, string | number | boolean>;
  style: string;
  primaryColor: string;
}) {
  const isLuxury = style.includes("luxury");

  return (
    <div
      className="px-3 py-2 flex flex-col"
      style={{
        background: isLuxury
          ? `linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(30,20,0,0.92) 100%)`
          : `linear-gradient(135deg, rgba(0,0,0,0.88) 0%, rgba(20,20,40,0.88) 100%)`,
        borderLeft: `3px solid ${isLuxury ? "#C9A84C" : primaryColor}`,
        backdropFilter: "blur(8px)",
        borderRadius: "0 6px 6px 0",
      }}
    >
      <span
        className="font-bold text-white leading-none"
        style={{ fontSize: "clamp(0.75rem, 2.5vw, 1.1rem)" }}
      >
        {String(content.name ?? "")}
      </span>
      {content.brokerage && (
        <span
          className="font-medium mt-0.5"
          style={{
            fontSize: "clamp(0.6rem, 1.8vw, 0.8rem)",
            color: isLuxury ? "#C9A84C" : primaryColor,
          }}
        >
          {String(content.brokerage)}
        </span>
      )}
    </div>
  );
}

function PriceBadge({
  content,
  primaryColor,
}: {
  content: Record<string, string | number | boolean>;
  primaryColor: string;
}) {
  return (
    <div
      className="px-3 py-1.5 text-center"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}ee, ${primaryColor}bb)`,
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
      }}
    >
      <p
        className="text-white/80 font-medium"
        style={{ fontSize: "clamp(0.5rem, 1.5vw, 0.65rem)", letterSpacing: "0.08em" }}
      >
        {String(content.label ?? "LISTED AT").toUpperCase()}
      </p>
      <p
        className="text-white font-black leading-tight"
        style={{ fontSize: "clamp(0.8rem, 3vw, 1.3rem)" }}
      >
        {String(content.price ?? "")}
      </p>
    </div>
  );
}

function AddressBanner({
  content,
  primaryColor,
}: {
  content: Record<string, string | number | boolean>;
  primaryColor: string;
}) {
  const stats = [content.beds && `${content.beds} bd`, content.baths && `${content.baths} ba`, content.sqft]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="w-full px-3 py-2"
      style={{
        background: "linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.0) 100%)",
      }}
    >
      <p
        className="text-white font-bold truncate"
        style={{ fontSize: "clamp(0.75rem, 2.5vw, 1rem)" }}
      >
        {String(content.address ?? "")}
      </p>
      {stats && (
        <p className="text-white/60" style={{ fontSize: "clamp(0.6rem, 1.8vw, 0.8rem)" }}>
          {stats}
        </p>
      )}
    </div>
  );
}

function RoomLabel({
  content,
  primaryColor,
}: {
  content: Record<string, string | number | boolean>;
  primaryColor: string;
}) {
  return (
    <div
      className="px-3 py-1 flex items-center gap-2"
      style={{
        background: `${primaryColor}cc`,
        backdropFilter: "blur(6px)",
        borderRadius: "0 20px 20px 0",
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full bg-white"
        style={{ boxShadow: "0 0 6px rgba(255,255,255,0.8)" }}
      />
      <span
        className="text-white font-semibold"
        style={{ fontSize: "clamp(0.65rem, 2vw, 0.9rem)", letterSpacing: "0.04em" }}
      >
        {String(content.room ?? "")}
      </span>
    </div>
  );
}

function FeatureTag({ content }: { content: Record<string, string | number | boolean> }) {
  return (
    <div
      className="px-2 py-1"
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <span className="text-white font-medium" style={{ fontSize: "clamp(0.55rem, 1.6vw, 0.75rem)" }}>
        ✦ {String(content.feature ?? "")}
      </span>
    </div>
  );
}

function PropertyStats({ content }: { content: Record<string, string | number | boolean> }) {
  const stats = [
    content.beds && { label: "Beds", value: String(content.beds) },
    content.baths && { label: "Baths", value: String(content.baths) },
    content.sqft && { label: "Sq Ft", value: String(content.sqft) },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (stats.length === 0) return null;

  return (
    <div
      className="flex items-center gap-4 px-4 py-2"
      style={{
        background: "linear-gradient(135deg, rgba(0,0,0,0.85), rgba(20,20,40,0.85))",
        backdropFilter: "blur(10px)",
        borderRadius: "12px",
      }}
    >
      {stats.map((stat, i) => (
        <div key={i} className="text-center">
          <div
            className="text-white font-black"
            style={{ fontSize: "clamp(1rem, 3.5vw, 1.6rem)" }}
          >
            {stat.value}
          </div>
          <div
            className="text-white/50 font-medium"
            style={{ fontSize: "clamp(0.5rem, 1.5vw, 0.65rem)", letterSpacing: "0.1em" }}
          >
            {stat.label.toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  );
}

function OpenHouseBanner({
  content,
  primaryColor,
}: {
  content: Record<string, string | number | boolean>;
  primaryColor: string;
}) {
  return (
    <div
      className="w-full px-4 py-3 text-center"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}ee, ${primaryColor}99)`,
        backdropFilter: "blur(8px)",
      }}
    >
      <p className="text-white font-black" style={{ fontSize: "clamp(0.9rem, 3vw, 1.4rem)" }}>
        OPEN HOUSE
      </p>
      <p className="text-white/90 font-medium" style={{ fontSize: "clamp(0.7rem, 2vw, 1rem)" }}>
        {[content.date, content.time].filter(Boolean).join(" · ")}
      </p>
      {content.address && (
        <p className="text-white/70" style={{ fontSize: "clamp(0.6rem, 1.6vw, 0.8rem)" }}>
          {String(content.address)}
        </p>
      )}
    </div>
  );
}

function LuxuryFrame() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        border: "2px solid rgba(201, 168, 76, 0.4)",
        boxShadow: "inset 0 0 60px rgba(201, 168, 76, 0.08), 0 0 0 1px rgba(201, 168, 76, 0.15)",
        borderRadius: "2px",
      }}
    />
  );
}

// ─── Main renderer ─────────────────────────────────────────────────────────────

export function OverlayRenderer({
  overlays,
  currentTime,
  primaryColor = "#3B82F6",
  secondaryColor = "#1e293b",
}: OverlayRendererProps) {
  const activeOverlays = overlays.filter(
    (o) => currentTime >= o.startTime && currentTime <= o.endTime
  );

  // Sort by zIndex
  const sorted = [...activeOverlays].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {sorted.map((overlay, i) => {
          // Skip non-visual types
          if (["punch_in_marker", "broll_transition", "color_grade"].includes(overlay.type)) {
            return null;
          }
          if (overlay.type === "luxury_frame") {
            return <LuxuryFrame key={`${overlay.type}-${i}`} />;
          }

          const anim = getAnim(overlay.animation);
          const posStyle: React.CSSProperties = {
            position: "absolute",
            left: `${overlay.position.x * 100}%`,
            top: `${overlay.position.y * 100}%`,
            transform: "translate(-50%, -50%)",
            zIndex: overlay.zIndex ?? 10,
          };

          // For edge-anchored overlays, adjust
          if (overlay.type === "lower_third" || overlay.type === "address_banner" || overlay.type === "open_house_info" || overlay.type === "property_stats") {
            posStyle.left = "50%";
            posStyle.transform = "translateX(-50%)";
            if (overlay.position.y > 0.5) {
              posStyle.top = "auto";
              posStyle.bottom = `${(1 - overlay.position.y) * 100}%`;
              posStyle.transform = "translateX(-50%)";
            } else {
              posStyle.top = `${overlay.position.y * 100}%`;
              posStyle.transform = "translateX(-50%)";
            }
          }

          if (overlay.type === "room_label") {
            posStyle.left = "0";
            posStyle.top = `${overlay.position.y * 100}%`;
            posStyle.transform = "translateY(-50%)";
          }

          if (overlay.type === "feature_tag") {
            posStyle.right = "8px";
            posStyle.left = "auto";
            posStyle.top = `${overlay.position.y * 100}%`;
            posStyle.transform = "translateY(-50%)";
          }

          return (
            <motion.div
              key={`${overlay.type}-${overlay.startTime}-${i}`}
              style={posStyle}
              initial={anim.initial}
              animate={anim.animate}
              exit={anim.exit}
              transition={{ duration: overlay.animDuration ?? 0.3, ease: "easeOut" }}
            >
              {overlay.type === "hook_text" && (
                <HookText content={overlay.content} primaryColor={primaryColor} />
              )}
              {overlay.type === "lower_third" && (
                <LowerThird content={overlay.content} style={overlay.style} primaryColor={primaryColor} />
              )}
              {overlay.type === "price_badge" && (
                <PriceBadge content={overlay.content} primaryColor={primaryColor} />
              )}
              {overlay.type === "address_banner" && (
                <AddressBanner content={overlay.content} primaryColor={primaryColor} />
              )}
              {overlay.type === "room_label" && (
                <RoomLabel content={overlay.content} primaryColor={primaryColor} />
              )}
              {overlay.type === "feature_tag" && (
                <FeatureTag content={overlay.content} />
              )}
              {overlay.type === "property_stats" && (
                <PropertyStats content={overlay.content} />
              )}
              {overlay.type === "open_house_info" && (
                <OpenHouseBanner content={overlay.content} primaryColor={primaryColor} />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

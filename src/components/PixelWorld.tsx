"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface AgentStatus {
  id: "scout" | "forge";
  state: string;
  message: string;
  progress: number;
}

interface PixelWorldProps {
  scoutStatus: AgentStatus;
  forgeStatus: AgentStatus;
}

// ---- Palette ----
const C = {
  // Environment
  floor: "#1a1a2e",
  floorLight: "#16213e",
  wall: "#0f3460",
  wallDark: "#0a2647",
  wallAccent: "#533483",
  // Scout (wizard)
  scoutRobe: "#4cc9f0",
  scoutRobeDark: "#3a86a8",
  scoutHat: "#7209b7",
  scoutHatBand: "#f72585",
  scoutSkin: "#ffd6a5",
  scoutStaff: "#b5838d",
  scoutGlow: "#4cc9f0",
  // Forge (alchemist)
  forgeApron: "#f59e0b",
  forgeApronDark: "#d97706",
  forgeGoggles: "#10b981",
  forgeSkin: "#ffd6a5",
  forgeHair: "#92400e",
  forgeFlask: "#34d399",
  // Furniture
  bookshelf: "#8b5e3c",
  bookColors: ["#e63946", "#457b9d", "#2a9d8f", "#e9c46a", "#f4a261"],
  cauldron: "#374151",
  cauldronBubble: "#34d399",
  telescope: "#6b7280",
  telescopeLens: "#60a5fa",
  table: "#92400e",
  tableLeg: "#78350f",
  flask: "#34d399",
  flaskLiquid: "#f59e0b",
  crystal: "#a78bfa",
  crystalGlow: "#c4b5fd",
  torch: "#f59e0b",
  torchFlame: "#ef4444",
  star: "#fbbf24",
  // UI
  textWhite: "#e5e7eb",
  textDim: "#6b7280",
  statusBg: "#111827",
  progressBg: "#1f2937",
  progressScout: "#06b6d4",
  progressForge: "#f59e0b",
};

// ---- Locations ----
type Location = "library" | "observatory" | "lab" | "cauldron" | "rest" | "center";

const STATE_TO_LOCATION: Record<string, Record<string, Location>> = {
  scout: {
    idle: "rest",
    booting: "center",
    searching: "observatory",
    analyzing: "library",
    processing: "library",
    synthesizing: "observatory",
    generating: "library",
    complete: "rest",
    error: "center",
  },
  forge: {
    idle: "rest",
    booting: "center",
    planning: "lab",
    configuring: "lab",
    preparing_data: "lab",
    loading_models: "cauldron",
    running: "cauldron",
    analyzing: "lab",
    complete: "rest",
    error: "center",
  },
};

const LOCATIONS: Record<Location, { x: number; y: number }> = {
  library: { x: 80, y: 180 },
  observatory: { x: 200, y: 80 },
  lab: { x: 420, y: 180 },
  cauldron: { x: 340, y: 100 },
  rest: { x: 260, y: 260 },
  center: { x: 260, y: 160 },
};

// ---- Sprite drawing helpers ----
function drawPixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

function drawScout(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, state: string) {
  const bob = state !== "idle" && state !== "complete" ? Math.sin(frame * 0.15) * 2 : 0;
  const bx = Math.floor(x);
  const by = Math.floor(y + bob);

  // Hat
  drawPixelRect(ctx, bx + 2, by - 16, 12, 3, C.scoutHat);
  drawPixelRect(ctx, bx + 4, by - 22, 8, 6, C.scoutHat);
  drawPixelRect(ctx, bx + 5, by - 26, 6, 4, C.scoutHat);
  drawPixelRect(ctx, bx + 7, by - 28, 2, 2, C.scoutHat);
  drawPixelRect(ctx, bx + 2, by - 13, 12, 2, C.scoutHatBand);
  // Star on hat
  if (frame % 30 < 15) {
    drawPixelRect(ctx, bx + 8, by - 25, 2, 2, C.star);
  }

  // Face
  drawPixelRect(ctx, bx + 4, by - 11, 8, 8, C.scoutSkin);
  // Eyes
  drawPixelRect(ctx, bx + 5, by - 8, 2, 2, "#1a1a2e");
  drawPixelRect(ctx, bx + 9, by - 8, 2, 2, "#1a1a2e");

  // Robe
  drawPixelRect(ctx, bx + 3, by - 3, 10, 12, C.scoutRobe);
  drawPixelRect(ctx, bx + 4, by - 3, 8, 12, C.scoutRobeDark);
  drawPixelRect(ctx, bx + 6, by - 3, 4, 12, C.scoutRobe);
  // Belt
  drawPixelRect(ctx, bx + 3, by + 2, 10, 2, C.scoutHatBand);

  // Arms
  const armSwing = state !== "idle" ? Math.sin(frame * 0.2) * 3 : 0;
  drawPixelRect(ctx, bx + 1, by - 2 + armSwing, 2, 6, C.scoutRobe);
  drawPixelRect(ctx, bx + 13, by - 2 - armSwing, 2, 6, C.scoutRobe);

  // Staff
  drawPixelRect(ctx, bx - 2, by - 20, 2, 28, C.scoutStaff);
  // Staff orb
  ctx.fillStyle = C.scoutGlow;
  ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1) * 0.3;
  ctx.beginPath();
  ctx.arc(bx - 1, by - 22, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Feet
  drawPixelRect(ctx, bx + 4, by + 9, 3, 2, "#1a1a2e");
  drawPixelRect(ctx, bx + 9, by + 9, 3, 2, "#1a1a2e");

  // Activity effect
  if (state === "searching" || state === "analyzing") {
    // Sparkles
    for (let i = 0; i < 3; i++) {
      const sx = bx + Math.sin(frame * 0.3 + i * 2) * 20;
      const sy = by - 10 + Math.cos(frame * 0.2 + i * 3) * 15;
      ctx.fillStyle = C.star;
      ctx.globalAlpha = 0.3 + Math.sin(frame * 0.15 + i) * 0.3;
      drawPixelRect(ctx, sx, sy, 2, 2, C.star);
    }
    ctx.globalAlpha = 1;
  }
}

function drawForge(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, state: string) {
  const bob = state !== "idle" && state !== "complete" ? Math.sin(frame * 0.12) * 1.5 : 0;
  const bx = Math.floor(x);
  const by = Math.floor(y + bob);

  // Goggles on head
  drawPixelRect(ctx, bx + 3, by - 14, 10, 4, C.forgeHair);
  drawPixelRect(ctx, bx + 2, by - 12, 4, 3, C.forgeGoggles);
  drawPixelRect(ctx, bx + 10, by - 12, 4, 3, C.forgeGoggles);
  drawPixelRect(ctx, bx + 6, by - 11, 4, 1, C.forgeGoggles);

  // Face
  drawPixelRect(ctx, bx + 4, by - 10, 8, 8, C.forgeSkin);
  // Eyes
  drawPixelRect(ctx, bx + 5, by - 7, 2, 2, "#1a1a2e");
  drawPixelRect(ctx, bx + 9, by - 7, 2, 2, "#1a1a2e");

  // Apron/body
  drawPixelRect(ctx, bx + 3, by - 2, 10, 12, C.forgeApron);
  drawPixelRect(ctx, bx + 5, by - 2, 6, 10, C.forgeApronDark);
  // Pockets
  drawPixelRect(ctx, bx + 4, by + 4, 3, 3, C.forgeApronDark);
  drawPixelRect(ctx, bx + 9, by + 4, 3, 3, C.forgeApronDark);

  // Arms
  const armSwing = state === "running" ? Math.sin(frame * 0.25) * 4 : state !== "idle" ? Math.sin(frame * 0.15) * 2 : 0;
  drawPixelRect(ctx, bx + 1, by - 1 + armSwing, 2, 6, C.forgeSkin);
  drawPixelRect(ctx, bx + 13, by - 1 - armSwing, 2, 6, C.forgeSkin);

  // Flask in hand
  if (state === "running" || state === "loading_models") {
    drawPixelRect(ctx, bx + 14, by - 2, 4, 6, C.forgeFlask);
    drawPixelRect(ctx, bx + 15, by - 1, 2, 4, C.flaskLiquid);
    // Bubbles
    if (frame % 10 < 5) {
      drawPixelRect(ctx, bx + 15, by - 4, 2, 2, C.cauldronBubble);
    }
  }

  // Feet
  drawPixelRect(ctx, bx + 4, by + 10, 3, 2, "#4b3621");
  drawPixelRect(ctx, bx + 9, by + 10, 3, 2, "#4b3621");

  // Activity effect - sparks when running
  if (state === "running" || state === "loading_models") {
    for (let i = 0; i < 4; i++) {
      const sx = bx + 8 + Math.sin(frame * 0.4 + i * 1.5) * 18;
      const sy = by - 5 + Math.cos(frame * 0.3 + i * 2) * 12;
      ctx.fillStyle = i % 2 === 0 ? C.torch : C.torchFlame;
      ctx.globalAlpha = 0.4 + Math.sin(frame * 0.2 + i) * 0.3;
      drawPixelRect(ctx, sx, sy, 2, 2, ctx.fillStyle);
    }
    ctx.globalAlpha = 1;
  }
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  // Shelf frame
  drawPixelRect(ctx, x, y, 30, 40, C.bookshelf);
  drawPixelRect(ctx, x + 2, y + 2, 26, 8, "#2a1810");
  drawPixelRect(ctx, x + 2, y + 14, 26, 8, "#2a1810");
  drawPixelRect(ctx, x + 2, y + 26, 26, 8, "#2a1810");

  // Books
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) {
      const bx = x + 3 + i * 5;
      const by = y + 3 + row * 12;
      const color = C.bookColors[(i + row * 2) % C.bookColors.length];
      drawPixelRect(ctx, bx, by, 4, 6, color);
    }
  }

  // Glow on active book
  if (frame % 60 < 30) {
    ctx.fillStyle = C.scoutGlow;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(x + 3, y + 3, 24, 6);
    ctx.globalAlpha = 1;
  }
}

function drawTelescope(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  // Stand
  drawPixelRect(ctx, x + 8, y + 15, 4, 20, C.telescope);
  drawPixelRect(ctx, x + 4, y + 33, 12, 3, C.telescope);
  // Tube
  drawPixelRect(ctx, x, y, 20, 6, C.telescope);
  drawPixelRect(ctx, x - 2, y + 1, 4, 4, C.telescopeLens);
  // Lens glow
  ctx.fillStyle = C.telescopeLens;
  ctx.globalAlpha = 0.3 + Math.sin(frame * 0.08) * 0.2;
  ctx.beginPath();
  ctx.arc(x - 1, y + 3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCauldron(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, active: boolean) {
  // Body
  drawPixelRect(ctx, x + 2, y + 4, 24, 16, C.cauldron);
  drawPixelRect(ctx, x, y + 6, 28, 12, C.cauldron);
  drawPixelRect(ctx, x + 4, y + 20, 20, 4, C.cauldron);
  // Rim
  drawPixelRect(ctx, x - 1, y + 3, 30, 3, "#4b5563");
  // Legs
  drawPixelRect(ctx, x + 4, y + 24, 4, 4, C.cauldron);
  drawPixelRect(ctx, x + 20, y + 24, 4, 4, C.cauldron);

  // Liquid
  drawPixelRect(ctx, x + 3, y + 6, 22, 10, active ? "#059669" : "#1f2937");

  // Bubbles
  if (active) {
    for (let i = 0; i < 3; i++) {
      const bx = x + 6 + i * 7;
      const by = y + 2 - Math.abs(Math.sin(frame * 0.15 + i * 2)) * 8;
      const size = 2 + (frame + i * 3) % 3;
      ctx.fillStyle = C.cauldronBubble;
      ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1 + i) * 0.3;
      ctx.beginPath();
      ctx.arc(bx, by, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Steam
    for (let i = 0; i < 4; i++) {
      const sx = x + 5 + i * 6;
      const sy = y - 2 - (frame * 0.5 + i * 8) % 20;
      ctx.fillStyle = "#9ca3af";
      ctx.globalAlpha = 0.15 - ((frame * 0.5 + i * 8) % 20) * 0.007;
      if (ctx.globalAlpha > 0) {
        ctx.beginPath();
        ctx.arc(sx + Math.sin(frame * 0.05 + i) * 3, sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawWorkbench(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Table
  drawPixelRect(ctx, x, y, 36, 4, C.table);
  drawPixelRect(ctx, x + 2, y + 4, 3, 12, C.tableLeg);
  drawPixelRect(ctx, x + 31, y + 4, 3, 12, C.tableLeg);
  // Items on table
  drawPixelRect(ctx, x + 5, y - 4, 4, 4, C.flask);
  drawPixelRect(ctx, x + 6, y - 3, 2, 2, C.flaskLiquid);
  drawPixelRect(ctx, x + 14, y - 6, 6, 6, "#4b5563"); // microscope base
  drawPixelRect(ctx, x + 15, y - 12, 4, 6, "#6b7280"); // microscope tube
  drawPixelRect(ctx, x + 26, y - 3, 6, 3, "#374151"); // notebook
}

function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  drawPixelRect(ctx, x + 1, y + 4, 3, 10, C.scoutStaff);
  // Flame
  const flicker = Math.sin(frame * 0.3) * 2;
  ctx.fillStyle = C.torch;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(x + 2.5, y + 2 + flicker, 3, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.torchFlame;
  ctx.beginPath();
  ctx.ellipse(x + 2.5, y + 1 + flicker, 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Light glow
  ctx.fillStyle = C.torch;
  ctx.globalAlpha = 0.06 + Math.sin(frame * 0.2) * 0.03;
  ctx.beginPath();
  ctx.arc(x + 2.5, y + 3, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  drawPixelRect(ctx, x + 2, y + 8, 6, 4, C.crystal);
  drawPixelRect(ctx, x + 3, y + 4, 4, 4, C.crystal);
  drawPixelRect(ctx, x + 4, y, 2, 4, C.crystalGlow);
  // Glow
  ctx.fillStyle = C.crystalGlow;
  ctx.globalAlpha = 0.1 + Math.sin(frame * 0.12) * 0.08;
  ctx.beginPath();
  ctx.arc(x + 5, y + 6, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawStars(ctx: CanvasRenderingContext2D, frame: number, width: number) {
  const stars = [
    { x: 30, y: 15, s: 1 }, { x: 90, y: 8, s: 2 }, { x: 170, y: 20, s: 1 },
    { x: 230, y: 5, s: 2 }, { x: 310, y: 18, s: 1 }, { x: 380, y: 10, s: 1 },
    { x: 440, y: 22, s: 2 }, { x: 500, y: 7, s: 1 }, { x: 140, y: 30, s: 1 },
    { x: 350, y: 28, s: 1 }, { x: 470, y: 15, s: 2 },
  ];
  for (const star of stars) {
    if (star.x > width) continue;
    ctx.fillStyle = C.star;
    ctx.globalAlpha = 0.3 + Math.sin(frame * 0.05 + star.x * 0.1) * 0.3;
    ctx.fillRect(star.x, star.y, star.s, star.s);
  }
  ctx.globalAlpha = 1;
}

function drawStatusBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  agent: AgentStatus,
  color: string,
  label: string
) {
  // Background
  ctx.fillStyle = C.statusBg;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x, y, 200, 44);
  ctx.globalAlpha = 1;

  // Border
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, 199, 43);
  ctx.globalAlpha = 1;

  // Agent name
  ctx.fillStyle = color;
  ctx.font = "bold 10px monospace";
  ctx.fillText(label, x + 6, y + 13);

  // Status message
  ctx.fillStyle = C.textDim;
  ctx.font = "8px monospace";
  const msg = agent.message.length > 28 ? agent.message.slice(0, 28) + "..." : agent.message;
  ctx.fillText(msg, x + 6, y + 25);

  // Progress bar
  ctx.fillStyle = C.progressBg;
  ctx.fillRect(x + 6, y + 32, 150, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x + 6, y + 32, Math.floor(150 * (agent.progress / 100)), 6);

  // Percentage
  ctx.fillStyle = C.textWhite;
  ctx.font = "bold 8px monospace";
  ctx.fillText(`${agent.progress}%`, x + 162, y + 38);
}

function drawRestArea(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Rug
  ctx.fillStyle = "#7c2d12";
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.ellipse(x + 15, y + 10, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Bench
  drawPixelRect(ctx, x, y, 30, 4, C.table);
  drawPixelRect(ctx, x + 1, y + 4, 3, 6, C.tableLeg);
  drawPixelRect(ctx, x + 26, y + 4, 3, 6, C.tableLeg);
}

export function PixelWorld({ scoutStatus, forgeStatus }: PixelWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const scoutPosRef = useRef({ x: LOCATIONS.rest.x, y: LOCATIONS.rest.y });
  const forgePosRef = useRef({ x: LOCATIONS.rest.x + 40, y: LOCATIONS.rest.y });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    frameRef.current++;
    const frame = frameRef.current;

    // Clear
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, W, H);

    // Stars
    drawStars(ctx, frame, W);

    // Floor tiles
    for (let tx = 0; tx < W; tx += 16) {
      for (let ty = 50; ty < H - 50; ty += 16) {
        ctx.fillStyle = (tx + ty) % 32 === 0 ? C.floor : C.floorLight;
        ctx.fillRect(tx, ty, 16, 16);
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.strokeRect(tx + 0.5, ty + 0.5, 15, 15);
      }
    }

    // Walls
    for (let wx = 0; wx < W; wx += 16) {
      drawPixelRect(ctx, wx, 42, 16, 10, C.wall);
      drawPixelRect(ctx, wx, 44, 16, 4, C.wallDark);
      if (wx % 64 === 0) drawPixelRect(ctx, wx + 6, 44, 4, 6, C.wallAccent);
    }

    // ---- Room labels ----
    ctx.fillStyle = C.textDim;
    ctx.font = "8px monospace";
    ctx.globalAlpha = 0.5;
    ctx.fillText("LIBRARY", 65, 230);
    ctx.fillText("OBSERVATORY", 175, 60);
    ctx.fillText("LABORATORY", 400, 230);
    ctx.fillText("CAULDRON", 325, 80);
    ctx.fillText("REST", 248, 295);
    ctx.globalAlpha = 1;

    // ---- Furniture ----
    drawBookshelf(ctx, 55, 140, frame);
    drawBookshelf(ctx, 95, 140, frame);
    drawTelescope(ctx, 210, 85, frame);
    drawCauldron(ctx, 325, 100, frame, forgeStatus.state === "running" || forgeStatus.state === "loading_models");
    drawWorkbench(ctx, 405, 190, );
    drawCrystal(ctx, 145, 130, frame);
    drawCrystal(ctx, 375, 195, frame);
    drawTorch(ctx, 40, 80, frame);
    drawTorch(ctx, 490, 80, frame);
    drawTorch(ctx, 260, 55, frame);
    drawRestArea(ctx, 245, 260);

    // ---- Move agents toward target ----
    const scoutTarget = LOCATIONS[STATE_TO_LOCATION.scout[scoutStatus.state] || "center"];
    const forgeTarget = LOCATIONS[STATE_TO_LOCATION.forge[forgeStatus.state] || "center"];

    const lerp = 0.04;
    scoutPosRef.current.x += (scoutTarget.x - scoutPosRef.current.x) * lerp;
    scoutPosRef.current.y += (scoutTarget.y - scoutPosRef.current.y) * lerp;
    forgePosRef.current.x += ((forgeTarget.x + 30) - forgePosRef.current.x) * lerp;
    forgePosRef.current.y += (forgeTarget.y - forgePosRef.current.y) * lerp;

    // ---- Draw agents ----
    drawScout(ctx, scoutPosRef.current.x, scoutPosRef.current.y, frame, scoutStatus.state);
    drawForge(ctx, forgePosRef.current.x, forgePosRef.current.y, frame, forgeStatus.state);

    // ---- Name tags ----
    ctx.font = "bold 7px monospace";
    ctx.fillStyle = C.scoutGlow;
    ctx.fillText("SCOUT", scoutPosRef.current.x - 2, scoutPosRef.current.y - 32);
    ctx.fillStyle = C.forgeApron;
    ctx.fillText("FORGE", forgePosRef.current.x - 2, forgePosRef.current.y - 18);

    // ---- Status bars ----
    drawStatusBar(ctx, 10, H - 54, scoutStatus, C.progressScout, "SCOUT");
    drawStatusBar(ctx, W - 210, H - 54, forgeStatus, C.progressForge, "FORGE");

    // ---- Mission timer ----
    ctx.fillStyle = C.textDim;
    ctx.font = "8px monospace";
    ctx.fillText(`FRAME ${frame}`, W / 2 - 25, H - 8);

    requestAnimationFrame(render);
  }, [scoutStatus, forgeStatus]);

  useEffect(() => {
    const id = requestAnimationFrame(render);
    return () => cancelAnimationFrame(id);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={540}
      height={340}
      className="w-full max-w-[540px] rounded-xl border border-white/10 mx-auto"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

"use client";

import { useRef, useEffect, useCallback, useState } from "react";

export interface AgentStatus {
  id: string;
  name: string;
  color: string;
  state: "idle" | "working" | "done" | "error";
  message: string;
}

interface PixelWorldProps {
  agents: AgentStatus[];
  onSceneClick?: (item: string) => void;
}

// ---- Palette ----
const C = {
  floor: "#1e1b2e",
  floorLight: "#231f36",
  floorAlt: "#262240",
  wall: "#2d2845",
  wallDark: "#1f1b30",
  wallMid: "#262040",
  wallTrim: "#3d3860",
  wallAccent: "#352f55",
  ceiling: "#16132a",
  ceilingLight: "#1a1630",
  deskTop: "#7a6250",
  deskLeg: "#4a3a2c",
  monitorFrame: "#374151",
  monitorOn: "#0f172a",
  keyboard: "#374151",
  chair: "#4b5563",
  chairSeat: "#374151",
  counter: "#5c4a3a",
  counterTop: "#8b7355",
  coffeeMachine: "#374151",
  coffeeBody: "#4b5563",
  coffeePot: "#6b4423",
  mug: "#e5e7eb",
  mugCoffee: "#6b4423",
  fridge: "#9ca3af",
  fridgeDark: "#6b7280",
  plant: "#10b981",
  plantPot: "#92400e",
  plantDark: "#059669",
  whiteboardFrame: "#9ca3af",
  windowFrame: "#4b5563",
  window: "#1e3a5f",
  windowSky: "#0c1929",
  waterCooler: "#60a5fa",
  waterBody: "#4b5563",
  bookshelf: "#5c4a3a",
  bookshelfDark: "#4a3a2c",
  serverRack: "#374151",
  serverLight: "#10b981",
  carpet: "#1a1535",
  carpetLight: "#201a40",
  skin: "#ffd6a5",
  hair: "#374151",
  textWhite: "#e5e7eb",
  textDim: "#6b7280",
  statusBg: "#111827",
  doorFrame: "#5c4a3a",
  doorColor: "#7a6250",
  poster1: "#7c3aed",
  poster2: "#ef4444",
  ceilingLamp: "#fbbf24",
};

// ---- Layout: 960x540, wall at y=90 ----
const WALL_Y = 90;
const DIVIDER_X = 620; // wall between work & break

// 6 workstations (3 cols x 2 rows)
const DESKS = [
  { x: 60, y: 150 },
  { x: 260, y: 150 },
  { x: 440, y: 150 },
  { x: 60, y: 310 },
  { x: 260, y: 310 },
  { x: 440, y: 310 },
];

const KITCHEN = { x: 680, y: 130 };
const LOUNGE = { x: 700, y: 340 };

// Hitboxes (scaled)
const HITBOXES: { id: string; x: number; y: number; w: number; h: number }[] = [
  { id: "whiteboard", x: 220, y: 95, w: 90, h: 54 },
  { id: "meeting_table", x: 360, y: 400, w: 100, h: 55 },
];

// ---- Helpers ----
function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

function shadeColor(hex: string, amt: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ---- Scene drawing ----
function drawWalls(ctx: CanvasRenderingContext2D, W: number, frame: number) {
  // Back wall
  px(ctx, 0, 0, W, WALL_Y + 10, C.ceiling);
  px(ctx, 0, 50, W, WALL_Y - 50, C.wallMid);
  px(ctx, 0, WALL_Y - 5, W, 15, C.wall);
  px(ctx, 0, WALL_Y + 5, W, 6, C.wallDark);
  // Wall trim pattern
  for (let wx = 0; wx < W; wx += 60) {
    px(ctx, wx + 25, WALL_Y + 1, 8, 4, C.wallTrim);
  }

  // Room divider wall (vertical, between workspace and break room)
  px(ctx, DIVIDER_X, WALL_Y, 8, 420, C.wall);
  px(ctx, DIVIDER_X, WALL_Y, 8, 420, C.wallDark);
  px(ctx, DIVIDER_X + 2, WALL_Y, 4, 420, C.wallMid);
  // Doorway in divider
  const doorY = WALL_Y + 60;
  px(ctx, DIVIDER_X, doorY, 8, 80, C.floor); // clear doorway
  px(ctx, DIVIDER_X - 2, doorY - 4, 12, 6, C.doorFrame); // door top frame
  px(ctx, DIVIDER_X - 2, doorY, 3, 82, C.doorFrame); // left frame
  px(ctx, DIVIDER_X + 7, doorY, 3, 82, C.doorFrame); // right frame

  // Ceiling lights
  const lampPositions = [150, 350, 520, 750];
  for (const lx of lampPositions) {
    px(ctx, lx, 44, 20, 3, "#374151");
    px(ctx, lx + 4, 47, 12, 2, C.ceilingLamp);
    // Light glow
    ctx.fillStyle = C.ceilingLamp;
    ctx.globalAlpha = 0.04 + Math.sin(frame * 0.02 + lx) * 0.01;
    ctx.fillRect(lx - 20, 49, 60, 60);
    ctx.globalAlpha = 1;
  }
}

function drawFloor(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Work area: tiled floor
  for (let tx = 0; tx < DIVIDER_X; tx += 20) {
    for (let ty = WALL_Y + 10; ty < H; ty += 20) {
      ctx.fillStyle = (tx + ty) % 40 === 0 ? C.floor : C.floorLight;
      ctx.fillRect(tx, ty, 20, 20);
      ctx.strokeStyle = "rgba(255,255,255,0.015)";
      ctx.strokeRect(tx + 0.5, ty + 0.5, 19, 19);
    }
  }
  // Break room: carpet
  for (let tx = DIVIDER_X + 8; tx < W; tx += 20) {
    for (let ty = WALL_Y + 10; ty < H; ty += 20) {
      ctx.fillStyle = (tx + ty) % 40 === 0 ? C.carpet : C.carpetLight;
      ctx.fillRect(tx, ty, 20, 20);
    }
  }
}

function drawWindows(ctx: CanvasRenderingContext2D, frame: number) {
  const positions = [70, 350, 700, 850];
  for (const wx of positions) {
    const w = 52, h = 40;
    const y = 52;
    px(ctx, wx, y, w, h, C.windowFrame);
    px(ctx, wx + 3, y + 3, 20, 34, C.windowSky);
    px(ctx, wx + 27, y + 3, 22, 34, C.windowSky);
    px(ctx, wx + 23, y, 4, h, C.windowFrame);
    px(ctx, wx, y + 18, w, 4, C.windowFrame);
    // Stars
    ctx.fillStyle = "#fbbf24";
    ctx.globalAlpha = 0.25 + Math.sin(frame * 0.03 + wx) * 0.2;
    px(ctx, wx + 8, y + 8, 2, 2, "#fbbf24");
    px(ctx, wx + 35, y + 12, 2, 2, "#fbbf24");
    px(ctx, wx + 16, y + 26, 2, 2, "#fbbf24");
    // Moon in one window
    if (wx === 70) {
      ctx.globalAlpha = 0.15;
      px(ctx, wx + 32, y + 6, 8, 8, "#fbbf24");
    }
    ctx.globalAlpha = 1;
  }
}

function drawBlackboard(ctx: CanvasRenderingContext2D, x: number, y: number, hovered: boolean, frame: number) {
  if (hovered) {
    ctx.fillStyle = "#10b981";
    ctx.globalAlpha = 0.06 + Math.sin(frame * 0.1) * 0.03;
    ctx.fillRect(x - 4, y - 4, 98, 62);
    ctx.globalAlpha = 1;
  }
  // Frame
  px(ctx, x, y, 90, 54, hovered ? "#6b7280" : C.whiteboardFrame);
  px(ctx, x + 3, y + 3, 84, 48, hovered ? "#2a4a2a" : "#1a3a1a");
  // Chalk lines
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 5; i++) {
    px(ctx, x + 10, y + 10 + i * 9, 28 + ((i * 7) % 20), 2, "#c8d8c0");
  }
  px(ctx, x + 56, y + 12, 6, 6, "#ef4444");
  px(ctx, x + 66, y + 22, 6, 6, "#10b981");
  px(ctx, x + 60, y + 34, 6, 6, "#f59e0b");
  // Lines between dots
  ctx.strokeStyle = "#c8d8c0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 59, y + 18);
  ctx.lineTo(x + 69, y + 25);
  ctx.lineTo(x + 63, y + 37);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Chalk tray
  px(ctx, x + 6, y + 52, 78, 4, "#5c3a1e");
  px(ctx, x + 16, y + 51, 8, 2, "#e8e0d0");
  px(ctx, x + 30, y + 51, 6, 2, "#fbbf24");
  px(ctx, x + 42, y + 51, 6, 2, "#60a5fa");
  if (hovered) {
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 10px monospace";
    ctx.fillText("CLICK TO OPEN", x + 8, y + 68);
  }
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Shelf frame
  px(ctx, x, y, 40, 70, C.bookshelf);
  px(ctx, x + 2, y + 2, 36, 20, C.bookshelfDark);
  px(ctx, x + 2, y + 26, 36, 20, C.bookshelfDark);
  px(ctx, x + 2, y + 50, 36, 18, C.bookshelfDark);
  // Books (colored spines)
  const bookColors = ["#ef4444", "#3b82f6", "#10b981", "#fbbf24", "#a78bfa", "#f472b6", "#06b6d4", "#fb923c"];
  for (let row = 0; row < 3; row++) {
    const ry = y + 4 + row * 24;
    let bx = x + 4;
    for (let b = 0; b < 6; b++) {
      const bw = 3 + (b % 3);
      const bh = 14 + (b % 2) * 2;
      px(ctx, bx, ry + (16 - bh), bw, bh, bookColors[(row * 6 + b) % bookColors.length]);
      bx += bw + 1;
    }
  }
}

function drawServerRack(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  px(ctx, x, y, 30, 60, C.serverRack);
  px(ctx, x + 2, y + 2, 26, 56, "#1a1a2e");
  // Server units
  for (let i = 0; i < 5; i++) {
    const sy = y + 4 + i * 11;
    px(ctx, x + 4, sy, 22, 8, "#2d3748");
    px(ctx, x + 6, sy + 2, 4, 4, "#1a1a2e");
    // Status lights
    const on = (frame + i * 17) % 60 < 40;
    px(ctx, x + 20, sy + 2, 3, 2, on ? C.serverLight : "#064e3b");
    px(ctx, x + 20, sy + 5, 3, 2, (frame + i * 23) % 80 < 50 ? "#3b82f6" : "#1e3a5f");
  }
}

function drawPoster(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string) {
  px(ctx, x, y, 30, 36, "#374151");
  px(ctx, x + 2, y + 2, 26, 32, color);
  ctx.fillStyle = "#e5e7eb";
  ctx.globalAlpha = 0.6;
  ctx.font = "bold 6px monospace";
  ctx.fillText(label, x + 4, y + 20);
  ctx.globalAlpha = 1;
}

function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  px(ctx, x, y, 18, 18, "#374151");
  px(ctx, x + 2, y + 2, 14, 14, "#1a1a2e");
  // Clock face dots
  ctx.fillStyle = "#6b7280";
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const dx = Math.cos(a) * 5;
    const dy = Math.sin(a) * 5;
    px(ctx, x + 9 + dx, y + 9 + dy, 1, 1, "#6b7280");
  }
  // Hands
  const minuteAngle = ((frame * 0.002) % 1) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = ((frame * 0.0002) % 1) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 9, y + 9);
  ctx.lineTo(x + 9 + Math.cos(hourAngle) * 3, y + 9 + Math.sin(hourAngle) * 3);
  ctx.stroke();
  ctx.strokeStyle = "#a78bfa";
  ctx.beginPath();
  ctx.moveTo(x + 9, y + 9);
  ctx.lineTo(x + 9 + Math.cos(minuteAngle) * 5, y + 9 + Math.sin(minuteAngle) * 5);
  ctx.stroke();
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, occupied: boolean, screenColor: string) {
  // Desk surface
  px(ctx, x, y + 30, 90, 8, C.deskTop);
  px(ctx, x + 4, y + 38, 6, 24, C.deskLeg);
  px(ctx, x + 80, y + 38, 6, 24, C.deskLeg);
  // Monitor
  px(ctx, x + 22, y, 46, 28, C.monitorFrame);
  px(ctx, x + 25, y + 3, 40, 20, occupied ? C.monitorOn : "#111111");
  if (occupied) {
    ctx.fillStyle = screenColor;
    ctx.globalAlpha = 0.15 + Math.sin(frame * 0.08) * 0.05;
    ctx.fillRect(x + 25, y + 3, 40, 20);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      const lw = 10 + ((frame + i * 7) % 22);
      ctx.globalAlpha = 0.6;
      px(ctx, x + 28, y + 7 + i * 5, Math.min(lw, 34), 2, screenColor);
    }
    ctx.globalAlpha = 1;
    if (frame % 40 < 20) {
      px(ctx, x + 28 + (frame % 28), y + 17, 2, 3, screenColor);
    }
  }
  // Monitor stand
  px(ctx, x + 40, y + 25, 10, 5, C.monitorFrame);
  // Keyboard
  px(ctx, x + 26, y + 33, 28, 4, C.keyboard);
  for (let i = 0; i < 10; i++) {
    px(ctx, x + 28 + i * 3, y + 34, 2, 2, "#4b5563");
  }
  // Mouse
  px(ctx, x + 60, y + 34, 6, 3, "#4b5563");
  // Chair
  px(ctx, x + 28, y + 54, 34, 6, C.chairSeat);
  px(ctx, x + 30, y + 60, 4, 8, C.chair);
  px(ctx, x + 56, y + 60, 4, 8, C.chair);
  px(ctx, x + 27, y + 44, 4, 10, C.chair);
  px(ctx, x + 59, y + 44, 4, 10, C.chair);
  px(ctx, x + 27, y + 42, 36, 4, C.chair);
}

function drawAgent(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, color: string, working: boolean) {
  const bob = working ? Math.sin(frame * 0.15) * 2 : 0;
  const bx = Math.floor(x);
  const by = Math.floor(y + bob);
  // Head
  px(ctx, bx + 3, by - 14, 14, 5, C.hair);
  px(ctx, bx + 5, by - 9, 10, 9, C.skin);
  // Eyes
  px(ctx, bx + 7, by - 5, 2, 2, "#1a1a2e");
  px(ctx, bx + 12, by - 5, 2, 2, "#1a1a2e");
  // Body
  px(ctx, bx + 3, by, 14, 12, color);
  px(ctx, bx + 8, by, 4, 12, shadeColor(color, -30));
  if (working) {
    px(ctx, bx + 1, by + 2, 4, 6, color);
    px(ctx, bx + 15, by + 2, 4, 6, color);
    px(ctx, bx, by + 7, 3, 2, C.skin);
    px(ctx, bx + 17, by + 7, 3, 2, C.skin);
  } else {
    const sw = Math.sin(frame * 0.06) * 2;
    px(ctx, bx + 1, by + 2 + sw, 4, 7, color);
    px(ctx, bx + 15, by + 2 - sw, 4, 7, color);
  }
  // Legs
  px(ctx, bx + 5, by + 12, 4, 6, "#2d2845");
  px(ctx, bx + 11, by + 12, 4, 6, "#2d2845");
}

function drawAgentWithCoffee(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, color: string) {
  const bob = Math.sin(frame * 0.05) * 2;
  const bx = Math.floor(x);
  const by = Math.floor(y + bob);
  px(ctx, bx + 3, by - 14, 14, 5, C.hair);
  px(ctx, bx + 5, by - 9, 10, 9, C.skin);
  px(ctx, bx + 7, by - 5, 2, 2, "#1a1a2e");
  px(ctx, bx + 12, by - 5, 2, 2, "#1a1a2e");
  px(ctx, bx + 8, by - 2, 4, 2, "#d4a574"); // smile
  px(ctx, bx + 3, by, 14, 12, color);
  px(ctx, bx + 8, by, 4, 12, shadeColor(color, -30));
  px(ctx, bx + 1, by + 2, 4, 7, color);
  px(ctx, bx + 15, by + 2, 4, 5, color);
  // Coffee mug
  px(ctx, bx + 19, by + 2, 7, 5, C.mug);
  px(ctx, bx + 20, by + 3, 5, 2, C.mugCoffee);
  // Steam
  if (frame % 30 < 20) {
    ctx.globalAlpha = 0.3;
    px(ctx, bx + 21, by - 2 - (frame % 10), 2, 2, "#9ca3af");
    px(ctx, bx + 23, by - 4 - (frame % 8), 2, 2, "#9ca3af");
    ctx.globalAlpha = 1;
  }
  px(ctx, bx + 5, by + 12, 4, 6, "#2d2845");
  px(ctx, bx + 11, by + 12, 4, 6, "#2d2845");
}

function drawSpeechBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, frame: number) {
  const maxLen = 24;
  const display = text.length > maxLen ? text.slice(0, maxLen - 2) + ".." : text;
  ctx.font = "bold 9px monospace";
  const tw = ctx.measureText(display).width;
  const padX = 6;
  const padY = 4;
  const bw = tw + padX * 2;
  const bh = 13 + padY * 2;
  const bx = Math.floor(x + 10 - bw / 2);
  const by = Math.floor(y - 36 - bh);
  const alpha = 0.9 + Math.sin(frame * 0.06) * 0.08;

  ctx.fillStyle = "#111827";
  ctx.globalAlpha = alpha;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha * 0.6;
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  ctx.fillStyle = "#111827";
  ctx.globalAlpha = alpha;
  ctx.fillRect(bx + bw / 2 - 3, by + bh, 6, 3);
  ctx.fillRect(bx + bw / 2 - 2, by + bh + 3, 4, 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.font = "bold 9px monospace";
  ctx.fillText(display, bx + padX, by + padY + 11);
  ctx.globalAlpha = 1;
}

function drawCoffeeMachine(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  px(ctx, x, y + 36, 100, 8, C.counterTop);
  px(ctx, x, y + 44, 100, 28, C.counter);
  px(ctx, x + 8, y, 36, 36, C.coffeeBody);
  px(ctx, x + 12, y + 4, 28, 20, C.coffeeMachine);
  px(ctx, x + 14, y + 6, 10, 14, "#1e40af");
  ctx.fillStyle = "#3b82f6";
  ctx.globalAlpha = 0.3;
  ctx.fillRect(x + 14, y + 6, 10, 14);
  ctx.globalAlpha = 1;
  px(ctx, x + 22, y + 24, 8, 4, C.coffeeMachine);
  px(ctx, x + 18, y + 28, 16, 8, C.coffeePot);
  px(ctx, x + 38, y + 8, 4, 4, frame % 60 < 30 ? "#10b981" : "#064e3b");
  // Mugs on counter
  px(ctx, x + 56, y + 30, 8, 6, C.mug);
  px(ctx, x + 70, y + 30, 8, 6, "#fbbf24");
  px(ctx, x + 84, y + 30, 8, 6, "#f472b6");
}

function drawFridge(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x, y, 32, 64, C.fridge);
  px(ctx, x + 2, y + 2, 28, 26, C.fridgeDark);
  px(ctx, x + 2, y + 32, 28, 30, C.fridgeDark);
  px(ctx, x + 26, y + 10, 3, 10, "#9ca3af");
  px(ctx, x + 26, y + 40, 3, 14, "#9ca3af");
  px(ctx, x, y + 28, 32, 4, "#6b7280");
}

function drawCouch(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x, y + 10, 90, 22, "#4a3a6a");
  px(ctx, x + 3, y + 12, 26, 16, "#5a4a7a");
  px(ctx, x + 32, y + 12, 26, 16, "#5a4a7a");
  px(ctx, x + 61, y + 12, 26, 16, "#5a4a7a");
  px(ctx, x, y, 90, 14, "#3a2a5a");
  px(ctx, x - 4, y + 4, 6, 26, "#4a3a6a");
  px(ctx, x + 88, y + 4, 6, 26, "#4a3a6a");
  px(ctx, x + 4, y + 32, 5, 5, C.deskLeg);
  px(ctx, x + 81, y + 32, 5, 5, C.deskLeg);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  px(ctx, x + 4, y + 18, 14, 14, C.plantPot);
  px(ctx, x + 5, y + 16, 12, 4, C.plantPot);
  const sway = Math.sin(frame * 0.03) * 2;
  px(ctx, x + 7, y + 4 + sway, 8, 14, C.plant);
  px(ctx, x + 2, y + 8 + sway, 6, 8, C.plantDark);
  px(ctx, x + 14, y + 6 - sway, 6, 10, C.plantDark);
  px(ctx, x + 5, y + sway, 12, 6, C.plant);
}

function drawWaterCooler(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x + 5, y + 32, 14, 24, C.waterBody);
  px(ctx, x + 2, y + 54, 20, 4, C.waterBody);
  px(ctx, x + 4, y, 16, 32, C.waterBody);
  px(ctx, x + 6, y + 2, 12, 26, C.waterCooler);
  ctx.fillStyle = "#93c5fd";
  ctx.globalAlpha = 0.3;
  ctx.fillRect(x + 6, y + 2, 12, 26);
  ctx.globalAlpha = 1;
  px(ctx, x + 8, y + 28, 8, 4, "#9ca3af");
}

function drawMeetingTable(ctx: CanvasRenderingContext2D, x: number, y: number, hovered: boolean, frame: number) {
  if (hovered) {
    ctx.fillStyle = "#a78bfa";
    ctx.globalAlpha = 0.06 + Math.sin(frame * 0.1) * 0.03;
    ctx.fillRect(x - 4, y - 4, 108, 63);
    ctx.globalAlpha = 1;
  }
  // Table surface (oval-ish conference table)
  px(ctx, x + 10, y + 10, 80, 30, hovered ? "#8b6a48" : "#7a6250");
  px(ctx, x + 6, y + 14, 88, 22, hovered ? "#8b6a48" : "#7a6250");
  // Table edge highlight
  px(ctx, x + 12, y + 12, 76, 2, "#9b8260");
  // Table legs
  px(ctx, x + 16, y + 40, 6, 14, C.deskLeg);
  px(ctx, x + 78, y + 40, 6, 14, C.deskLeg);
  // Chairs around the table
  const chairPositions = [
    { cx: x + 6, cy: y + 18 },    // left
    { cx: x + 88, cy: y + 18 },   // right
    { cx: x + 28, cy: y + 2 },    // top left
    { cx: x + 58, cy: y + 2 },    // top right
    { cx: x + 28, cy: y + 40 },   // bottom left
    { cx: x + 58, cy: y + 40 },   // bottom right
  ];
  for (const cp of chairPositions) {
    px(ctx, cp.cx, cp.cy, 12, 10, C.chairSeat);
    px(ctx, cp.cx + 2, cp.cy + 1, 8, 8, "#4b5563");
  }
  // Items on table
  px(ctx, x + 30, y + 18, 8, 5, "#374151"); // laptop
  px(ctx, x + 32, y + 19, 4, 2, "#3b82f6"); // screen glow
  px(ctx, x + 55, y + 20, 6, 4, C.mug);
  px(ctx, x + 45, y + 16, 4, 6, "#e5e7eb"); // paper
  // Label
  if (hovered) {
    ctx.fillStyle = "#a78bfa";
    ctx.font = "bold 10px monospace";
    ctx.fillText("CLICK FOR MEETING", x - 4, y + 62);
  } else {
    ctx.fillStyle = C.textDim;
    ctx.globalAlpha = 0.4;
    ctx.font = "9px monospace";
    ctx.fillText("MEETING TABLE", x + 12, y + 62);
    ctx.globalAlpha = 1;
  }
}

function drawStatusBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, agent: AgentStatus) {
  ctx.fillStyle = C.statusBg;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(x, y, w, 32);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = agent.color;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, 30);
  ctx.globalAlpha = 1;
  ctx.fillStyle = agent.color;
  ctx.font = "bold 11px monospace";
  ctx.fillText(agent.name, x + 8, y + 14);
  const dotColor = agent.state === "working" ? "#10b981" : agent.state === "done" ? "#3b82f6" : agent.state === "error" ? "#ef4444" : "#4b5563";
  px(ctx, x + w - 16, y + 8, 6, 6, dotColor);
  ctx.fillStyle = C.textDim;
  ctx.font = "9px monospace";
  const msg = agent.message.length > 22 ? agent.message.slice(0, 22) + ".." : agent.message;
  ctx.fillText(msg, x + 8, y + 26);
}

// ---- Room labels ----
function drawRoomLabels(ctx: CanvasRenderingContext2D) {
  ctx.font = "bold 11px monospace";
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = C.textDim;
  ctx.fillText("W O R K S P A C E", 210, 140);
  ctx.fillText("B R E A K   R O O M", 680, 125);
  ctx.globalAlpha = 1;
}

// ================================================================
export function PixelWorld({ agents, onSceneClick }: PixelWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const posRef = useRef<{ x: number; y: number }[]>([]);
  const agentsRef = useRef(agents);
  agentsRef.current = agents;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const rafRef = useRef(0);

  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    if (!pos) return;
    let found: string | null = null;
    for (const hb of HITBOXES) {
      if (pos.x >= hb.x && pos.x <= hb.x + hb.w && pos.y >= hb.y && pos.y <= hb.y + hb.h) {
        found = hb.id;
        break;
      }
    }
    hoveredRef.current = found;
    setHoveredItem(found);
  }, [getCanvasPos]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    if (!pos || !onSceneClick) return;
    for (const hb of HITBOXES) {
      if (pos.x >= hb.x && pos.x <= hb.x + hb.w && pos.y >= hb.y && pos.y <= hb.y + hb.h) {
        onSceneClick(hb.id);
        break;
      }
    }
  }, [getCanvasPos, onSceneClick]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentAgents = agentsRef.current;
    const W = canvas.width;
    const H = canvas.height;
    frameRef.current++;
    const frame = frameRef.current;
    const hovered = hoveredRef.current;

    if (posRef.current.length === 0) {
      posRef.current = currentAgents.map(() => ({ x: LOUNGE.x, y: LOUNGE.y }));
    }
    while (posRef.current.length < currentAgents.length) {
      posRef.current.push({ x: LOUNGE.x, y: LOUNGE.y });
    }

    // ---- Background ----
    ctx.fillStyle = C.ceiling;
    ctx.fillRect(0, 0, W, H);
    drawFloor(ctx, W, H);
    drawWalls(ctx, W, frame);
    drawWindows(ctx, frame);
    drawRoomLabels(ctx);

    // ---- Wall decorations ----
    drawBlackboard(ctx, 220, 95, hovered === "whiteboard", frame);
    drawPoster(ctx, 140, 56, C.poster1, "AI");
    drawPoster(ctx, 480, 56, C.poster2, "ML");
    drawClock(ctx, 550, 60, frame);
    drawBookshelf(ctx, 15, 96);
    drawServerRack(ctx, 560, 96, frame);

    // ---- Desks ----
    currentAgents.forEach((agent, i) => {
      if (i < DESKS.length) {
        const d = DESKS[i];
        drawDesk(ctx, d.x, d.y, frame, agent.state === "working", agent.color);
        ctx.fillStyle = agent.color;
        ctx.globalAlpha = 0.7;
        ctx.font = "bold 9px monospace";
        ctx.fillText(agent.name, d.x + 14, d.y + 75);
        ctx.globalAlpha = 1;
      }
    });

    // ---- Break room furniture ----
    drawCoffeeMachine(ctx, KITCHEN.x, KITCHEN.y, frame);
    drawFridge(ctx, KITCHEN.x + 120, KITCHEN.y - 8);
    drawCouch(ctx, LOUNGE.x - 20, LOUNGE.y);
    drawPlant(ctx, LOUNGE.x + 100, LOUNGE.y - 10, frame);
    drawPlant(ctx, DIVIDER_X + 20, WALL_Y + 10, frame);
    drawWaterCooler(ctx, LOUNGE.x - 50, LOUNGE.y - 16);

    // ---- Meeting table ----
    drawMeetingTable(ctx, 360, 400, hovered === "meeting_table", frame);

    // ---- Agents ----
    const IDLE_CHATTER = [
      "Need more coffee...",
      "Nice weather today",
      "Reviewing notes...",
      "Thinking about it...",
      "Taking a breather",
      "Refueling...",
    ];

    currentAgents.forEach((agent, i) => {
      let targetX: number, targetY: number;
      if (agent.state === "working" && i < DESKS.length) {
        targetX = DESKS[i].x + 32;
        targetY = DESKS[i].y + 36;
      } else {
        const idleSlot = i % 3;
        if (idleSlot === 0) {
          targetX = LOUNGE.x + (i * 22) % 70;
          targetY = LOUNGE.y - 12;
        } else if (idleSlot === 1) {
          targetX = KITCHEN.x + 30 + (i * 18) % 50;
          targetY = KITCHEN.y + 40;
        } else {
          targetX = LOUNGE.x + 30 + (i * 16) % 50;
          targetY = LOUNGE.y + 40;
        }
      }
      const pos = posRef.current[i];
      pos.x += (targetX - pos.x) * 0.04;
      pos.y += (targetY - pos.y) * 0.04;

      if (agent.state === "working") {
        drawAgent(ctx, pos.x, pos.y, frame, agent.color, true);
      } else {
        drawAgentWithCoffee(ctx, pos.x, pos.y, frame, agent.color);
      }

      // Speech bubbles — staggered
      const cycle = 300, show = 180, off = i * 47;
      const phase = (frame + off) % cycle;
      if (phase < show) {
        const txt = agent.state === "working"
          ? (agent.message || "Working...")
          : IDLE_CHATTER[(Math.floor(frame / cycle) + i) % IDLE_CHATTER.length];
        drawSpeechBubble(ctx, pos.x, pos.y, txt, agent.color, frame);
      }
    });

    // ---- Status bars ----
    const maxBars = Math.min(currentAgents.length, 7);
    const barW = Math.floor((W - 20) / maxBars);
    currentAgents.forEach((agent, i) => {
      if (i < maxBars) {
        drawStatusBar(ctx, 8 + i * barW, H - 40, barW - 6, agent);
      }
    });

    // Frame tag
    ctx.fillStyle = C.textDim;
    ctx.font = "8px monospace";
    ctx.globalAlpha = 0.2;
    ctx.fillText(`LUMI OFFICE`, W / 2 - 30, H - 6);
    ctx.globalAlpha = 1;

    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={540}
      className="w-full border-2 border-[#374151]"
      style={{
        imageRendering: "pixelated",
        cursor: hoveredItem ? "pointer" : "default",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { hoveredRef.current = null; setHoveredItem(null); }}
      onClick={handleClick}
    />
  );
}

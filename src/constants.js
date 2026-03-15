export const GRID_COLS = 16;
export const GRID_ROWS = 16;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 960;
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 800;
export const UI_HEIGHT = 160;
export const CELL_WIDTH = 50;   // exactly 800 / 16 — no floating point
export const CELL_HEIGHT = 50;  // exactly 800 / 16 — no floating point

// Platform
export const PLATFORM_ROW = 14;
export const PLATFORM_WIDTH_CELLS = 4;

// Physics
export const MOMENTUM_INFLUENCE_FACTOR = 120;
export const LOOK_AHEAD_SECONDS = 0.5;

// Shield & Parry
export const PARRY_WINDOW_MS = 8;
export const PARRY_SLOWDOWN_SCALE = 0.15;
export const PARRY_SLOWDOWN_DURATION_MS = 600;
export const SHIELD_BREAK_LOCKOUT_MS = 3000;

// Phase & Attack
export const PHASE_TRANSITION_PAUSE_MS = 1500;
export const CHARGE_DAMAGE_ZONE_WIDTH_CELLS = 3;

// Enemy Navigation
export const ENEMY_ARENA_MAX_ROW = 12;
export const NAV_RECALC_INTERVAL_MS = 400;
export const ENEMY_SEPARATION_FORCE = 60;

// Grid Visuals
export const GRID_LINE_ALPHA = 0.08;
export const CELL_HIGHLIGHT_ALPHA = 0.35;
export const WARNING_HIGHLIGHT_ALPHA = 0.2;

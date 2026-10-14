// Table Tennis ITTF Dimensions & Physical Constants

export const TABLE_LENGTH = 2.74; // meters (along Z-axis, -1.37 to +1.37)
export const TABLE_WIDTH = 1.525;  // meters (along X-axis, -0.7625 to +0.7625)
export const TABLE_HEIGHT = 0.76;  // meters (top surface height above floor, Y-axis)
export const TABLE_THICKNESS = 0.05; // 5cm table top thickness

export const NET_HEIGHT = 0.1525; // meters (15.25 cm above table surface)
export const NET_OVERHANG = 0.1525; // meters beyond table width on each side
export const NET_WIDTH = TABLE_WIDTH + 2 * NET_OVERHANG; // 1.83 meters
export const NET_Y_TOP = TABLE_HEIGHT + NET_HEIGHT; // ~0.9125m

export const BALL_RADIUS = 0.02; // 20mm radius (40mm diameter)
export const BALL_MASS = 0.0027; // 2.7 grams

export const PADDLE_RADIUS = 0.08; // 8cm radius (16cm diameter blade)
export const PADDLE_HANDLE_LENGTH = 0.10;
export const PADDLE_THICKNESS = 0.012;

export const GRAVITY = 9.81; // m/s^2
export const AIR_DRAG = 0.08; // subtle air drag coefficient

// Collision Restitution & Friction
export const TABLE_RESTITUTION = 0.89; // high bounce on stiff composite wood table
export const PADDLE_RESTITUTION = 0.82; // sponge rubber paddle bounce
export const NET_RESTITUTION = 0.15; // net absorbs energy significantly

// Table Bounds for collision checks
export const TABLE_MIN_X = -TABLE_WIDTH / 2;
export const TABLE_MAX_X = TABLE_WIDTH / 2;
export const TABLE_MIN_Z = -TABLE_LENGTH / 2;
export const TABLE_MAX_Z = TABLE_LENGTH / 2;

// Player & Opponent baseline / play areas
// Player 1 (near side): Z > 0, normal position Z ~ +1.45 to +1.8
// Player 2 / AI (far side): Z < 0, normal position Z ~ -1.45 to -1.8
export const PLAYER_PADDLE_Z = 1.55;
export const OPPONENT_PADDLE_Z = -1.55;

export const PADDLE_MIN_X = TABLE_MIN_X - 0.4;
export const PADDLE_MAX_X = TABLE_MAX_X + 0.4;
export const PADDLE_MIN_Y = TABLE_HEIGHT - 0.05;
export const PADDLE_MAX_Y = TABLE_HEIGHT + 0.70;

// Maximum paddle speed limit (meters/second) to prevent spoofing/teleportation
export const MAX_PADDLE_SPEED = 12.0;

// Game Rules
export const POINTS_TO_WIN = 11;
export const WIN_BY_MARGIN = 2;
export const SERVICE_ROTATION_INTERVAL = 2; // alternates every 2 points

// Simulation Timestep
export const PHYSICS_FPS = 60;
export const PHYSICS_DT = 1 / PHYSICS_FPS;
export const SUB_STEPS = 4; // Sub-steps per physics frame for collision accuracy (240Hz effective)
export const NETWORK_TICK_RATE = 30; // 30Hz network snapshot broadcast

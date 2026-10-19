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
export const PADDLE_HITBOX_RADIUS = 0.165; // Forgiving collision radius for intuitive, reliable contact
export const PADDLE_HANDLE_LENGTH = 0.10;
export const PADDLE_THICKNESS = 0.012;

export const GRAVITY = 9.81; // m/s^2
export const AIR_DRAG = 0.15; // air resistance damping (v = v * (1 - 0.15 * dt))

// Collision Restitution & Friction
export const TABLE_RESTITUTION = 0.85; // table vertical bounce restitution
export const PADDLE_RESTITUTION = 0.82; // sponge rubber paddle bounce
export const NET_RESTITUTION = 0.15; // net absorbs energy significantly

// Table Bounds for collision checks
export const TABLE_MIN_X = -TABLE_WIDTH / 2;
export const TABLE_MAX_X = TABLE_WIDTH / 2;
export const TABLE_MIN_Z = -TABLE_LENGTH / 2;
export const TABLE_MAX_Z = TABLE_LENGTH / 2;

// Player & Opponent baseline / play areas
// Player 1 (near side): Z > 0, normal position Z ~ +1.80 to +1.88
// Player 2 / AI (far side): Z < 0, normal position Z ~ -1.80 to -1.88
export const PLAYER_PADDLE_Z = 1.84;
export const OPPONENT_PADDLE_Z = -1.84;

export const PADDLE_MIN_X = TABLE_MIN_X - 0.4;
export const PADDLE_MAX_X = TABLE_WIDTH / 2 + 0.4;
export const PADDLE_MIN_Y = TABLE_HEIGHT - 0.05;
export const PADDLE_MAX_Y = TABLE_HEIGHT + 0.62; // 1.38m ceiling allowing comfortable reach for high balls & smashes

// Paddle blade clearance limits to prevent clipping through table surface & aprons
export const BLADE_RADIUS_Y = PADDLE_RADIUS * 1.06; // 0.0848m
export const TABLE_SURFACE_CLEARANCE = 0.006; // 6mm clearance above table surface
export const PADDLE_TABLE_MIN_Y = TABLE_HEIGHT + BLADE_RADIUS_Y + TABLE_SURFACE_CLEARANCE; // ~0.851m
export const PADDLE_FLOOR_MIN_Y = TABLE_HEIGHT + 0.02; // 0.78m (guarantees blade center stays above table surface)

/**
 * Calculates the legal minimum Y for the paddle blade center at (x, z).
 * When directly over the table or close to the table edge/apron, the blade center is guaranteed >= PADDLE_TABLE_MIN_Y,
 * preventing any clipping or visual brokenness with the table surface, end apron, or frame.
 * When safely behind or wide of the table, minimum Y smoothly transitions down to PADDLE_FLOOR_MIN_Y (0.72m).
 */
export function getMinPaddleY(x: number, z: number): number {
  const halfW = TABLE_WIDTH / 2;
  const halfL = TABLE_LENGTH / 2;
  const distX = Math.max(0, Math.abs(x) - halfW);
  const distZ = Math.max(0, Math.abs(z) - halfL);

  // If over the table slab or immediately bordering the table edge/apron (< 5-6cm gap):
  if (distX < 0.05 && distZ < 0.06) {
    return PADDLE_TABLE_MIN_Y;
  }

  // Smooth, continuous transition once safely clear of the table perimeter
  const dist = Math.hypot(distX, distZ);
  const factor = Math.min(1.0, Math.max(0, (dist - 0.05) / 0.22));
  return PADDLE_TABLE_MIN_Y - factor * (PADDLE_TABLE_MIN_Y - PADDLE_FLOOR_MIN_Y);
}

// Serve ball positioning offsets (natural separation in front of racket)
export const SERVE_BALL_OFFSET_Z = 0.26; // 26cm in front of racket blade
export const SERVE_BALL_OFFSET_Y = 0.07; // 7cm above paddle center

// Aerodynamics, Magnus effect, and Spin physics constants
export const MAGNUS_COEFFICIENT = 0.0028; // Calibrated 3D vector Magnus acceleration (m/s^2 per (rad/s * m/s))
export const MAX_SPIN = 220.0; // rad/s (~2100 RPM max realistic topspin/sidespin)
export const SPIN_AIR_DECAY = 0.12; // 12% spin decay per second in air
export const SPIN_BOUNCE_DECAY = 0.80; // 20% spin decay on each table bounce (ω *= 0.8)
export const SPIN_BOUNCE_FRICTION = 0.0035; // Friction kick from table contact per rad/s spin
export const TABLE_FRICTION = 0.12; // Table surface horizontal friction coefficient
export const PADDLE_FRICTION = 0.38; // Rubber high-friction grip coefficient for spin transfer

// Serve ITTF parameters
export const MIN_SERVE_RELEASE_SPEED = 0.08; // Forward stroke speed (m/s) to strike serve
export const SERVE_TOSS_VELOCITY = 2.1; // m/s upward toss (~22cm rise, satisfies ITTF >= 16cm law 2.6.2)
export const SERVE_MIN_TOSS_RISE = 0.16; // 16cm ITTF minimum toss height
export const PADDLE_CONTACT_COOLDOWN = 0.14; // 140ms contact cooldown to prevent multi-frame double hits

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


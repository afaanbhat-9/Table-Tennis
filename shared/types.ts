// Shared types for Table Tennis

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type PlayerSide = 'player1' | 'player2';
export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface BallState {
  pos: Vector3D;
  vel: Vector3D;
  spin?: Vector3D; // Angular velocity in rad/s: x = topspin(+)/backspin(-), y = sidespin (right(+)/left(-)), z = corkscrew
  serveState?: 'held' | 'tossed' | 'in_play'; // 'held' in palm/ready, 'tossed' rising/falling, 'in_play' once struck
  lastHitter: PlayerSide | null;
  // Track bounce on table for table tennis rules
  bounceCountCurrentSide: number;
  lastBounceSide: PlayerSide | null;
  hasBouncedOnServerSide: boolean;
  hasBouncedOnReceiverSide: boolean;
  isServe: boolean;
  active: boolean;
  netTouched?: boolean; // Whether ball touched net assembly in current flight
}

export interface PaddleState {
  pos: Vector3D;
  vel: Vector3D;
  rot: Vector3D; // Euler angles in radians (e.g. pitch, yaw, roll)
  isSwinging?: boolean;
  swingPhase?: 'idle' | 'windup' | 'forward' | 'followthrough' | 'recovery';
}

export type MatchPhase =
  | 'idle'
  | 'countdown'
  | 'serving'
  | 'in_play'
  | 'point_scored'
  | 'game_over';

export interface MatchScore {
  player1: number;
  player2: number;
  winner: PlayerSide | null;
}

export interface ServeInfo {
  server: PlayerSide;
  receiver: PlayerSide;
  serveNumber: number; // total points played so far
}

export type SoundEventType =
  | 'paddle_hit'
  | 'table_hit'
  | 'net_hit'
  | 'score'
  | 'applause'
  | 'fault'
  | 'let'
  | 'toss';

export interface SoundEvent {
  type: SoundEventType;
  intensity?: number;
  pos?: Vector3D;
}

export interface GameSnapshot {
  timestamp: number;
  tick: number;
  phase: MatchPhase;
  countdown?: number; // 3, 2, 1
  ball: BallState;
  paddle1: PaddleState;
  paddle2: PaddleState;
  score: MatchScore;
  serve: ServeInfo;
  pointWinnerBanner?: {
    winner: PlayerSide;
    reason: string;
  } | null;
  soundEvents?: SoundEvent[];
}

export interface PlayerInput {
  seq: number;
  timestamp: number;
  targetPos: Vector3D;
  velocity: Vector3D;
  swingPower: number; // 0 to 1
  isSwinging?: boolean;
  swingPhase?: 'idle' | 'windup' | 'forward' | 'followthrough' | 'recovery';
  swingDirection?: Vector3D;
}

// Room & Multiplayer types
export interface PlayerProfile {
  id: string;
  name: string;
  flag?: string;
  isHost: boolean;
  isReady: boolean;
  side: PlayerSide;
  ping?: number;
}

export interface RoomState {
  code: string;
  players: {
    player1?: PlayerProfile;
    player2?: PlayerProfile;
  };
  phase: 'lobby' | 'countdown' | 'playing' | 'ended';
  score: MatchScore;
  createdAt: number;
}

// Client to Server socket events
export interface ClientToServerEvents {
  'party:create': (data: { playerName: string; flag?: string }, callback: (res: { success: boolean; code?: string; room?: RoomState; error?: string }) => void) => void;
  'party:join': (data: { code: string; playerName: string; flag?: string }, callback: (res: { success: boolean; room?: RoomState; error?: string }) => void) => void;
  'party:ready': (data: { isReady: boolean }) => void;
  'party:start': () => void;
  'party:leave': () => void;
  'party:rematch': () => void;
  'game:input': (input: PlayerInput) => void;
  'ping': (clientTime: number, callback: (clientTime: number) => void) => void;
}

// Server to Client socket events
export interface ServerToClientEvents {
  'party:updated': (room: RoomState) => void;
  'party:error': (message: string) => void;
  'game:countdown': (count: number) => void;
  'game:start': (initialSnapshot: GameSnapshot) => void;
  'game:snapshot': (snapshot: GameSnapshot) => void;
  'game:point_scored': (data: { score: MatchScore; winner: PlayerSide; reason: string }) => void;
  'game:over': (data: { score: MatchScore; winner: PlayerSide }) => void;
  'player:disconnected': (data: { side: PlayerSide; message: string }) => void;
  'party:left': () => void;
}

import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  GameSnapshot,
  MatchScore,
  PlayerInput,
  PlayerSide,
  RoomState,
  ServerToClientEvents
} from '../../../shared/types.js';

export class NetworkClient {
  public socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  public isConnected: boolean = false;
  public roomState: RoomState | null = null;
  public mySide: PlayerSide = 'player1';
  public pingMs: number = 0;

  // Snapshot Interpolation Buffer
  private snapshots: GameSnapshot[] = [];
  public latestSnapshot: GameSnapshot | null = null;

  // Event callbacks
  public onPartyUpdated: ((room: RoomState) => void) | null = null;
  public onGameCountdown: ((count: number) => void) | null = null;
  public onGameSnapshot: ((snap: GameSnapshot) => void) | null = null;
  public onPointScored: ((data: { score: MatchScore; winner: PlayerSide; reason: string }) => void) | null = null;
  public onGameOver: ((data: { score: MatchScore; winner: PlayerSide }) => void) | null = null;
  public onPlayerDisconnected: ((data: { side: PlayerSide; message: string }) => void) | null = null;
  public onPartyLeft: (() => void) | null = null;

  constructor() {
    this.connect();
  }

  public connect(): void {
    if (this.socket) return;

    // Connect to server (in dev vite runs on 3000/5173 and server on 3001; in prod same origin)
    const isDev = window.location.port === '3000' || window.location.port === '5173';
    const serverUrl = isDev
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : window.location.origin;

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.measurePing();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('party:updated', (room) => {
      this.roomState = room;
      if (this.onPartyUpdated) this.onPartyUpdated(room);
    });

    this.socket.on('game:countdown', (count) => {
      if (this.onGameCountdown) this.onGameCountdown(count);
    });

    this.socket.on('game:snapshot', (snap) => {
      this.latestSnapshot = snap;
      this.snapshots.push(snap);
      if (this.snapshots.length > 30) this.snapshots.shift();
      if (this.onGameSnapshot) this.onGameSnapshot(snap);
    });

    this.socket.on('game:point_scored', (data) => {
      if (this.onPointScored) this.onPointScored(data);
    });

    this.socket.on('game:over', (data) => {
      if (this.onGameOver) this.onGameOver(data);
    });

    this.socket.on('player:disconnected', (data) => {
      if (this.onPlayerDisconnected) this.onPlayerDisconnected(data);
    });

    this.socket.on('party:left', () => {
      this.roomState = null;
      if (this.onPartyLeft) this.onPartyLeft();
    });

    // Periodic ping measurement
    setInterval(() => {
      if (this.isConnected) this.measurePing();
    }, 5000);
  }

  private ensureConnected(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) {
        this.connect();
      }
      if (!this.socket) {
        resolve(false);
        return;
      }
      if (this.socket.connected) {
        resolve(true);
        return;
      }
      const onConnect = () => {
        cleanup();
        resolve(true);
      };
      const onError = () => {
        cleanup();
        resolve(false);
      };
      const timer = setTimeout(() => {
        cleanup();
        resolve(false);
      }, 6000);
      const cleanup = () => {
        clearTimeout(timer);
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
      };
      this.socket.once('connect', onConnect);
      this.socket.once('connect_error', onError);
      this.socket.connect();
    });
  }

  public measurePing(): void {
    if (!this.socket || !this.isConnected) return;
    const start = performance.now();
    this.socket.emit('ping', Date.now(), () => {
      this.pingMs = Math.round(performance.now() - start);
    });
  }

  public async createParty(playerName: string, flag: string = '🇹🇷'): Promise<{ success: boolean; code?: string; room?: RoomState; error?: string }> {
    const connected = await this.ensureConnected();
    if (!connected || !this.socket) {
      return { success: false, error: 'Could not connect to multiplayer server. Please ensure the server is running.' };
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({ success: false, error: 'Party creation timed out. Please try again.' });
      }, 8000);

      this.socket!.emit('party:create', { playerName, flag }, (res) => {
        clearTimeout(timer);
        if (res.success) {
          this.mySide = 'player1';
          if (res.room) {
            this.roomState = res.room;
          }
        }
        resolve(res);
      });
    });
  }

  public async joinParty(code: string, playerName: string, flag: string = '🇺🇸'): Promise<{ success: boolean; room?: RoomState; error?: string }> {
    const connected = await this.ensureConnected();
    if (!connected || !this.socket) {
      return { success: false, error: 'Could not connect to multiplayer server. Please ensure the server is running.' };
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({ success: false, error: 'Join party timed out. Please try again.' });
      }, 8000);

      this.socket!.emit('party:join', { code, playerName, flag }, (res) => {
        clearTimeout(timer);
        if (res.success) {
          this.mySide = 'player2';
          if (res.room) {
            this.roomState = res.room;
          }
        }
        resolve(res);
      });
    });
  }

  public setReady(isReady: boolean): void {
    if (!this.socket) return;
    this.socket.emit('party:ready', { isReady });
  }

  public startMatch(): void {
    if (!this.socket) return;
    this.socket.emit('party:start');
  }

  public rematch(): void {
    if (!this.socket) return;
    this.socket.emit('party:rematch');
  }

  public leaveParty(): void {
    if (!this.socket) return;
    this.socket.emit('party:leave');
    this.roomState = null;
  }

  public sendInput(input: PlayerInput): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('game:input', input);
  }

  /**
   * Interpolate between recent server snapshots for butter-smooth animation.
   */
  public getInterpolatedState(renderTimeOffsetMs: number = 40): GameSnapshot | null {
    if (this.snapshots.length === 0) return null;
    if (this.snapshots.length === 1) return this.snapshots[0];

    const targetTime = Date.now() - renderTimeOffsetMs;

    // Find the two surrounding snapshots
    let prev = this.snapshots[0];
    let next = this.snapshots[this.snapshots.length - 1];

    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i].timestamp <= targetTime && this.snapshots[i + 1].timestamp >= targetTime) {
        prev = this.snapshots[i];
        next = this.snapshots[i + 1];
        break;
      }
    }

    const timeDiff = next.timestamp - prev.timestamp;
    const factor = timeDiff > 0 ? Math.max(0, Math.min(1, (targetTime - prev.timestamp) / timeDiff)) : 1;

    // Interpolate ball & opponent paddle
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    return {
      ...next,
      ball: {
        ...next.ball,
        pos: {
          x: lerp(prev.ball.pos.x, next.ball.pos.x, factor),
          y: lerp(prev.ball.pos.y, next.ball.pos.y, factor),
          z: lerp(prev.ball.pos.z, next.ball.pos.z, factor)
        }
      },
      paddle1: {
        ...next.paddle1,
        pos: {
          x: lerp(prev.paddle1.pos.x, next.paddle1.pos.x, factor),
          y: lerp(prev.paddle1.pos.y, next.paddle1.pos.y, factor),
          z: lerp(prev.paddle1.pos.z, next.paddle1.pos.z, factor)
        }
      },
      paddle2: {
        ...next.paddle2,
        pos: {
          x: lerp(prev.paddle2.pos.x, next.paddle2.pos.x, factor),
          y: lerp(prev.paddle2.pos.y, next.paddle2.pos.y, factor),
          z: lerp(prev.paddle2.pos.z, next.paddle2.pos.z, factor)
        }
      }
    };
  }

  public destroy(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  PlayerProfile,
  PlayerSide,
  RoomState,
  ServerToClientEvents
} from '../../shared/types.js';
import { GameRoom } from './gameRoom.js';

export class RoomManager {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private rooms: Map<string, GameRoom> = new Map();
  private socketToRoom: Map<string, { code: string; side: PlayerSide }> = new Map();
  private roomCreatedAt: Map<string, number> = new Map();

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;

    // Periodic room cleanup for abandoned rooms older than 30 minutes
    setInterval(() => {
      this.cleanupExpiredRooms();
    }, 60000);
  }

  /**
   * Generates a unique 6-character party code.
   */
  private generateUniqueCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous I, 1, O, 0
    let code: string;
    let attempts = 0;

    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
      if (attempts > 100) {
        code += Date.now().toString().slice(-4);
        break;
      }
    } while (this.rooms.has(code));

    return code;
  }

  public createParty(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    playerName: string,
    flag?: string
  ): { success: boolean; code?: string; error?: string } {
    // Check if player is already in a room
    if (this.socketToRoom.has(socket.id)) {
      this.leaveParty(socket);
    }

    const code = this.generateUniqueCode();
    const hostProfile: PlayerProfile = {
      id: socket.id,
      name: (playerName || 'Player 1').slice(0, 20).trim(),
      flag: flag || '🇹🇷',
      isHost: true,
      isReady: true,
      side: 'player1'
    };

    const room = new GameRoom(code, hostProfile, this.io);
    this.rooms.set(code, room);
    this.roomCreatedAt.set(code, Date.now());
    this.socketToRoom.set(socket.id, { code, side: 'player1' });

    socket.join(code);

    return { success: true, code };
  }

  public joinParty(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    rawCode: string,
    playerName: string,
    flag?: string
  ): { success: boolean; room?: RoomState; error?: string } {
    const code = (rawCode || '').trim().toUpperCase();

    if (!code) {
      return { success: false, error: 'Please enter a valid party code.' };
    }

    const room = this.rooms.get(code);
    if (!room) {
      return { success: false, error: `Party code "${code}" not found or expired.` };
    }

    if (room.player2) {
      return { success: false, error: 'This party is already full (2/2 players).' };
    }

    if (room.player1.id === socket.id) {
      return { success: false, error: 'You are already in this party as host.' };
    }

    // Leave any current room
    if (this.socketToRoom.has(socket.id)) {
      this.leaveParty(socket);
    }

    const guestProfile: PlayerProfile = {
      id: socket.id,
      name: (playerName || 'Player 2').slice(0, 20).trim(),
      flag: flag || '🇺🇸',
      isHost: false,
      isReady: false,
      side: 'player2'
    };

    room.setGuest(guestProfile);
    this.socketToRoom.set(socket.id, { code, side: 'player2' });

    socket.join(code);

    const roomState = this.getRoomState(room);
    this.io.to(code).emit('party:updated', roomState);

    return { success: true, room: roomState };
  }

  public setReady(socket: Socket<ClientToServerEvents, ServerToClientEvents>, isReady: boolean): void {
    const binding = this.socketToRoom.get(socket.id);
    if (!binding) return;

    const room = this.rooms.get(binding.code);
    if (!room) return;

    if (binding.side === 'player1') {
      room.player1.isReady = isReady;
    } else if (room.player2) {
      room.player2.isReady = isReady;
    }

    this.io.to(binding.code).emit('party:updated', this.getRoomState(room));
  }

  public startMatch(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    const binding = this.socketToRoom.get(socket.id);
    if (!binding || binding.side !== 'player1') return;

    const room = this.rooms.get(binding.code);
    if (!room || !room.player2) return;

    if (!room.player1.isReady || !room.player2.isReady) return;

    room.phase = 'countdown';
    this.io.to(binding.code).emit('party:updated', this.getRoomState(room));
    room.startMatch();
  }

  public rematch(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    const binding = this.socketToRoom.get(socket.id);
    if (!binding) return;

    const room = this.rooms.get(binding.code);
    if (!room || !room.player2) return;

    // Reset readiness and start match again
    room.player1.isReady = true;
    room.player2.isReady = true;
    room.startMatch();
  }

  public handleInput(socket: Socket<ClientToServerEvents, ServerToClientEvents>, input: any): void {
    const binding = this.socketToRoom.get(socket.id);
    if (!binding) return;

    const room = this.rooms.get(binding.code);
    if (!room) return;

    room.handleInput(binding.side, input);
  }

  public leaveParty(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    const binding = this.socketToRoom.get(socket.id);
    if (!binding) return;

    const { code, side } = binding;
    this.socketToRoom.delete(socket.id);
    socket.leave(code);
    socket.emit('party:left');

    const room = this.rooms.get(code);
    if (!room) return;

    if (side === 'player1') {
      // Host left: room closes
      this.io.to(code).emit('player:disconnected', {
        side: 'player1',
        message: 'Host has left the party. Party disbanded.'
      });
      room.destroy();
      this.rooms.delete(code);
      this.roomCreatedAt.delete(code);
    } else {
      // Guest left
      room.player2 = undefined;
      room.stopGameLoops();
      room.phase = 'idle';
      this.io.to(code).emit('player:disconnected', {
        side: 'player2',
        message: 'Opponent has left the party.'
      });
      this.io.to(code).emit('party:updated', this.getRoomState(room));
    }
  }

  public handleDisconnect(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    this.leaveParty(socket);
  }

  public getRoomState(room: GameRoom): RoomState {
    return {
      code: room.code,
      players: {
        player1: room.player1,
        player2: room.player2
      },
      phase: room.phase === 'countdown' || room.phase === 'in_play' || room.phase === 'serving'
        ? 'playing'
        : (room.phase === 'game_over' ? 'ended' : 'lobby'),
      score: room.getScore(),
      createdAt: this.roomCreatedAt.get(room.code) || Date.now()
    };
  }

  private cleanupExpiredRooms(): void {
    const now = Date.now();
    const expireDuration = 30 * 60 * 1000; // 30 minutes

    for (const [code, createdAt] of this.roomCreatedAt.entries()) {
      if (now - createdAt > expireDuration) {
        const room = this.rooms.get(code);
        if (room) {
          room.destroy();
          this.rooms.delete(code);
        }
        this.roomCreatedAt.delete(code);
      }
    }
  }
}

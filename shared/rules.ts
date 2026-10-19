import {
  POINTS_TO_WIN,
  WIN_BY_MARGIN,
  SERVICE_ROTATION_INTERVAL,
  TABLE_MIN_X,
  TABLE_MAX_X,
  TABLE_MIN_Z,
  TABLE_MAX_Z
} from './constants.js';
import { MatchScore, PlayerSide, ServeInfo } from './types.js';

export class RuleEngine {
  public score: MatchScore;
  public totalPointsPlayed: number = 0;
  public serve: ServeInfo;
  public initialServer: PlayerSide = 'player1';

  constructor() {
    this.score = { player1: 0, player2: 0, winner: null };
    this.serve = {
      server: 'player1',
      receiver: 'player2',
      serveNumber: 0
    };
  }

  public reset(startingServer: PlayerSide = 'player1'): void {
    this.score = { player1: 0, player2: 0, winner: null };
    this.totalPointsPlayed = 0;
    this.initialServer = startingServer;
    this.updateService(this.initialServer);
  }

  public awardPoint(winner: PlayerSide): {
    score: MatchScore;
    gameOver: boolean;
    nextServer: PlayerSide;
  } {
    if (winner === 'player1') {
      this.score.player1++;
    } else {
      this.score.player2++;
    }

    this.totalPointsPlayed++;

    // Check game over condition (first to 11 points with margin of 2)
    const p1 = this.score.player1;
    const p2 = this.score.player2;

    if ((p1 >= POINTS_TO_WIN || p2 >= POINTS_TO_WIN) && Math.abs(p1 - p2) >= WIN_BY_MARGIN) {
      this.score.winner = p1 > p2 ? 'player1' : 'player2';
      return {
        score: { ...this.score },
        gameOver: true,
        nextServer: this.serve.server
      };
    }

    // Determine next server
    this.updateService();

    return {
      score: { ...this.score },
      gameOver: false,
      nextServer: this.serve.server
    };
  }

  private updateService(startingServer?: PlayerSide): void {
    const sServer = startingServer || this.initialServer;
    const p1 = this.score.player1;
    const p2 = this.score.player2;

    // In deuce (both >= 10), service alternates every 1 point.
    // Otherwise, service alternates every SERVICE_ROTATION_INTERVAL (2 points).
    const isDeuce = p1 >= 10 && p2 >= 10;
    const rotationInterval = isDeuce ? 1 : SERVICE_ROTATION_INTERVAL;

    let serverNumber: number;
    if (isDeuce) {
      // 20 points played up to 10-10, thereafter alternate every point
      const pointsAfterDeuce = this.totalPointsPlayed - 20;
      serverNumber = Math.floor(20 / SERVICE_ROTATION_INTERVAL) + pointsAfterDeuce;
    } else {
      serverNumber = Math.floor(this.totalPointsPlayed / rotationInterval);
    }

    const currentServer: PlayerSide = (serverNumber % 2 === 0)
      ? sServer
      : (sServer === 'player1' ? 'player2' : 'player1');

    this.serve = {
      server: currentServer,
      receiver: currentServer === 'player1' ? 'player2' : 'player1',
      serveNumber: this.totalPointsPlayed
    };
  }

  public static isWithinTableBounds(x: number, z: number): boolean {
    return x >= TABLE_MIN_X && x <= TABLE_MAX_X && z >= TABLE_MIN_Z && z <= TABLE_MAX_Z;
  }

  public static getTableSide(z: number): PlayerSide | null {
    if (z > 0 && z <= TABLE_MAX_Z) return 'player1';
    if (z < 0 && z >= TABLE_MIN_Z) return 'player2';
    return null;
  }
}

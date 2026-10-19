import { Vector3D } from './types.js';

export type SwingPhase = 'idle' | 'windup' | 'forward' | 'followthrough' | 'recovery';

export interface SwingConfig {
  windupDuration: number;      // seconds (~0.035s)
  forwardDuration: number;     // seconds (~0.075s, contact window)
  followthroughDuration: number; // seconds (~0.085s)
  recoveryDuration: number;    // seconds (~0.110s)
  maxForwardDist: number;      // meters forward surge along Z (~0.22m)
  maxSpeed: number;            // max paddle forward speed (~9.5 m/s)
}

export const DEFAULT_SWING_CONFIG: SwingConfig = {
  windupDuration: 0.035,
  forwardDuration: 0.075,
  followthroughDuration: 0.085,
  recoveryDuration: 0.110,
  maxForwardDist: 0.16,
  maxSpeed: 9.5
};

export class SwingState {
  public phase: SwingPhase = 'idle';
  public timer: number = 0;
  public strength: number = 0.5; // 0.0 to 1.0
  public direction: Vector3D = { x: 0, y: 0.2, z: -1 }; // Normalized swing vector (towards -Z for P1)
  public isPlayer1: boolean = true;

  private config: SwingConfig;

  // Real-time calculated offsets from base paddle position
  public offset: Vector3D = { x: 0, y: 0, z: 0 };
  public velocity: Vector3D = { x: 0, y: 0, z: 0 };
  public tilt: Vector3D = { x: 0, y: 0, z: 0 };

  constructor(isPlayer1: boolean = true, config: SwingConfig = DEFAULT_SWING_CONFIG) {
    this.isPlayer1 = isPlayer1;
    this.config = config;
  }

  public triggerSwing(direction: Vector3D, strength: number = 0.7): boolean {
    // Cannot re-trigger while currently in forward stroke or followthrough
    if (this.phase === 'forward' || this.phase === 'followthrough') {
      return false;
    }

    this.phase = 'windup';
    this.timer = 0;
    this.strength = Math.max(0.3, Math.min(1.0, strength));

    // Normalize direction vector
    const dirZ = this.isPlayer1 ? -1 : 1;
    const len = Math.hypot(direction.x, direction.y, direction.z || dirZ) || 1;
    this.direction = {
      x: direction.x / len,
      y: direction.y / len,
      z: (direction.z ? direction.z / len : dirZ)
    };

    return true;
  }

  /**
   * Triggers an immediate forward strike animation upon ball contact.
   */
  public triggerHitSwing(direction?: Vector3D, strength: number = 0.75): void {
    this.phase = 'forward';
    this.timer = 0;
    this.strength = Math.max(0.4, Math.min(1.0, strength));
    const dirZ = this.isPlayer1 ? -1 : 1;
    if (direction) {
      const len = Math.hypot(direction.x, direction.y, direction.z || dirZ) || 1;
      this.direction = {
        x: direction.x / len,
        y: direction.y / len,
        z: direction.z ? direction.z / len : dirZ
      };
    } else {
      this.direction = { x: 0, y: 0.15, z: dirZ };
    }
  }

  public reset(): void {
    this.phase = 'idle';
    this.timer = 0;
    this.offset = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.tilt = { x: 0, y: 0, z: 0 };
  }

  public update(dt: number): void {
    if (this.phase === 'idle') {
      this.offset = { x: 0, y: 0, z: 0 };
      this.velocity = { x: 0, y: 0, z: 0 };
      this.tilt = { x: 0, y: 0, z: 0 };
      return;
    }

    this.timer += dt;
    const dirSign = this.isPlayer1 ? -1 : 1;

    switch (this.phase) {
      case 'windup': {
        const progress = Math.min(1.0, this.timer / this.config.windupDuration);
        // Pull back slightly along Z
        const backZ = -dirSign * 0.04 * progress * this.strength;
        this.offset = {
          x: -this.direction.x * 0.02 * progress,
          y: -0.02 * progress,
          z: backZ
        };
        this.velocity = {
          x: 0,
          y: 0,
          z: -dirSign * 0.5 * this.strength
        };
        // Tilt paddle back slightly
        this.tilt = {
          x: dirSign * 0.2 * progress,
          y: -this.direction.x * 0.25 * progress,
          z: 0
        };

        if (this.timer >= this.config.windupDuration) {
          this.phase = 'forward';
          this.timer = 0;
        }
        break;
      }

      case 'forward': {
        // Active forward acceleration & ball-contact window
        const progress = Math.min(1.0, this.timer / this.config.forwardDuration);
        const forwardDistance = this.config.maxForwardDist * this.strength;
        const currentZ = dirSign * forwardDistance * progress;
        const currentX = this.direction.x * 0.12 * progress * this.strength;
        const currentY = Math.max(-0.06, this.direction.y * 0.10 * progress * this.strength);

        this.offset = {
          x: currentX,
          y: currentY,
          z: currentZ
        };

        // Forward stroke velocity
        const strokeSpeed = (forwardDistance / this.config.forwardDuration) * 1.2;
        this.velocity = {
          x: (this.direction.x * 0.12 * this.strength) / this.config.forwardDuration,
          y: (this.direction.y * 0.10 * this.strength) / this.config.forwardDuration,
          z: dirSign * Math.min(this.config.maxSpeed, strokeSpeed)
        };

        // Paddle rotates forward into topspin/drive angle
        this.tilt = {
          x: -dirSign * 0.35 * progress,
          y: this.direction.x * 0.4 * progress,
          z: -this.direction.x * 0.3 * progress
        };

        if (this.timer >= this.config.forwardDuration) {
          this.phase = 'followthrough';
          this.timer = 0;
        }
        break;
      }

      case 'followthrough': {
        // Followthrough deceleration
        const progress = Math.min(1.0, this.timer / this.config.followthroughDuration);
        const maxDist = this.config.maxForwardDist * this.strength;
        // Peak extension with slight arc
        const currentZ = dirSign * (maxDist + 0.04 * (1 - progress));
        const currentX = this.direction.x * 0.14 * this.strength;
        const currentY = (this.direction.y * 0.12 + 0.04 * progress) * this.strength;

        this.offset = {
          x: currentX,
          y: currentY,
          z: currentZ
        };

        // Decelerating velocity
        const decay = 1 - progress;
        this.velocity = {
          x: this.velocity.x * decay,
          y: this.velocity.y * decay,
          z: this.velocity.z * decay
        };

        this.tilt = {
          x: -dirSign * 0.35 * (1 + 0.1 * progress),
          y: this.direction.x * 0.4,
          z: -this.direction.x * 0.35
        };

        if (this.timer >= this.config.followthroughDuration) {
          this.phase = 'recovery';
          this.timer = 0;
        }
        break;
      }

      case 'recovery': {
        // Smoothly blend back to base position
        const progress = Math.min(1.0, this.timer / this.config.recoveryDuration);
        const ease = 1 - Math.pow(1 - progress, 2); // ease out

        this.offset = {
          x: this.offset.x * (1 - ease),
          y: this.offset.y * (1 - ease),
          z: this.offset.z * (1 - ease)
        };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.tilt = {
          x: this.tilt.x * (1 - ease),
          y: this.tilt.y * (1 - ease),
          z: this.tilt.z * (1 - ease)
        };

        if (this.timer >= this.config.recoveryDuration) {
          this.phase = 'idle';
          this.timer = 0;
          this.offset = { x: 0, y: 0, z: 0 };
          this.tilt = { x: 0, y: 0, z: 0 };
        }
        break;
      }
    }
  }

  public isContactWindowActive(): boolean {
    return this.phase === 'forward';
  }

  public getEffectiveVelocity(): Vector3D {
    return this.velocity;
  }
}

import * as THREE from 'three';
import {
  PADDLE_MIN_X,
  PADDLE_MAX_X,
  PADDLE_MIN_Y,
  PADDLE_MAX_Y,
  PLAYER_PADDLE_Z,
  TABLE_HEIGHT
} from '../../../shared/constants.js';
import { PaddleState, PlayerInput, Vector3D } from '../../../shared/types.js';
import { SwingState } from '../../../shared/swing.js';

interface PointerSample {
  x: number;
  y: number;
  time: number;
}

export class InputController {
  private domElement: HTMLElement;
  private camera: THREE.PerspectiveCamera;

  // Permitted paddle positioning
  public targetPos: Vector3D = {
    x: 0.25,
    y: TABLE_HEIGHT + 0.16,
    z: PLAYER_PADDLE_Z
  };

  public currentPaddle: PaddleState = {
    pos: { x: 0.25, y: TABLE_HEIGHT + 0.16, z: PLAYER_PADDLE_Z },
    vel: { x: 0, y: 0, z: 0 },
    rot: { x: -0.1, y: 0.08, z: -0.05 },
    isSwinging: false,
    swingPhase: 'idle'
  };

  // Swing state machine
  public swingState: SwingState;

  // Pointer tracking & history for flick gesture detection
  private pointerHistory: PointerSample[] = [];
  private isPointerActive: boolean = false;
  private hasReceivedInitialPointer: boolean = false;
  private inputSeq: number = 0;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private planeZ: THREE.Plane;

  // Flick thresholds tuned for physical mouse, laptop trackpad, and touch screens
  // Minimum speed: ~700 px/sec or small fast displacement
  private readonly FLICK_MIN_SPEED_PX = 650;
  private readonly FLICK_MIN_DISPLACEMENT_PX = 20;
  private readonly FLICK_WINDOW_MS = 100;

  // Sensitivity
  public sensitivity: number = 1.0;

  // Callback when swing is triggered (for audio or visual effects)
  public onSwingTriggered: ((strength: number, direction: Vector3D) => void) | null = null;

  constructor(domElement: HTMLElement, camera: THREE.PerspectiveCamera) {
    this.domElement = domElement;
    this.camera = camera;
    this.planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), -PLAYER_PADDLE_Z);
    this.swingState = new SwingState(true);

    this.bindEvents();
  }

  private bindEvents(): void {
    const onPointerMove = (e: PointerEvent) => {
      this.handlePointerMove(e.clientX, e.clientY);
    };

    const onPointerDown = (e: PointerEvent) => {
      this.isPointerActive = true;
      this.handlePointerDown(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      this.handlePointerUp(e.clientX, e.clientY);
      this.isPointerActive = false;
    };

    const onPointerCancel = () => {
      this.isPointerActive = false;
      this.pointerHistory = [];
    };

    this.domElement.addEventListener('pointermove', onPointerMove, { passive: true });
    this.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    // Prevent default touch gestures (scrolling/zoom) specifically on the game canvas
    this.domElement.style.touchAction = 'none';

    // Prevent right click menu
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handlePointerDown(clientX: number, clientY: number): void {
    const now = performance.now();
    this.recordSample(clientX, clientY, now);
    this.updatePositionFromScreen(clientX, clientY);

    // Optional click-to-swing: Clicking also allows immediate swing trigger
    // Especially helpful for trackpad users who tap/click to swing!
    this.evaluateSwingFromGesture(clientX, clientY, now, true);
  }

  private handlePointerMove(clientX: number, clientY: number): void {
    const now = performance.now();
    this.recordSample(clientX, clientY, now);
    this.updatePositionFromScreen(clientX, clientY);

    // Check if recent movement history qualifies as a deliberate directional flick swing
    this.evaluateSwingFromGesture(clientX, clientY, now, false);
  }

  private handlePointerUp(clientX: number, clientY: number): void {
    const now = performance.now();
    // On touch release, evaluate if the release was the completion of a flick gesture
    this.evaluateSwingFromGesture(clientX, clientY, now, false);
    this.pointerHistory = [];
  }

  private recordSample(x: number, y: number, time: number): void {
    this.pointerHistory.push({ x, y, time });
    // Keep only samples within the flick detection window
    const cutoff = time - this.FLICK_WINDOW_MS;
    while (this.pointerHistory.length > 0 && this.pointerHistory[0].time < cutoff) {
      this.pointerHistory.shift();
    }
  }

  private updatePositionFromScreen(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const intersectionPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.planeZ, intersectionPoint);

    if (hit) {
      const targetX = Math.max(PADDLE_MIN_X, Math.min(PADDLE_MAX_X, hit.x * this.sensitivity));
      const targetY = Math.max(PADDLE_MIN_Y, Math.min(PADDLE_MAX_Y, hit.y));

      this.targetPos.x = targetX;
      this.targetPos.y = targetY;

      // Smooth initial placement without sudden jump
      if (!this.hasReceivedInitialPointer) {
        this.currentPaddle.pos.x = targetX;
        this.currentPaddle.pos.y = targetY;
        this.hasReceivedInitialPointer = true;
      }
    }
  }

  private evaluateSwingFromGesture(
    currentX: number,
    currentY: number,
    now: number,
    isClickTrigger: boolean
  ): void {
    // If already in active forward stroke or followthrough, do not retrigger
    if (this.swingState.phase === 'forward' || this.swingState.phase === 'followthrough') {
      return;
    }

    if (this.pointerHistory.length < 2) {
      if (isClickTrigger) {
        // Direct click trigger with default forward drive
        this.triggerSwing({ x: 0, y: 0.2, z: -1 }, 0.7);
      }
      return;
    }

    // Examine movement over the recent window
    const oldest = this.pointerHistory[0];
    const dt = (now - oldest.time) / 1000;
    if (dt <= 0.005) return;

    const dx = currentX - oldest.x;
    const dy = currentY - oldest.y;
    const distPx = Math.hypot(dx, dy);
    const speedPx = distPx / dt;

    // Check if movement exceeds the flick speed and displacement threshold
    const isFlick = speedPx >= this.FLICK_MIN_SPEED_PX && distPx >= this.FLICK_MIN_DISPLACEMENT_PX;

    if (isFlick || isClickTrigger) {
      // Calculate swing direction in 3D:
      // dx > 0: right cross-court / slice
      // dx < 0: left cross-court / inside-out
      // dy < 0 (moving up on screen): topspin lift (+Y, -Z)
      // dy > 0 (moving down on screen): flat/chop smash (-Y, -Z)
      const normDirX = (dx / (distPx || 1)) * 0.8;
      const normDirY = Math.max(-0.4, (-dy / (distPx || 1)) * 0.6);
      const dirZ = -1.0;

      const strength = Math.min(1.0, Math.max(0.4, speedPx / 1800));
      this.triggerSwing({ x: normDirX, y: normDirY, z: dirZ }, strength);

      // Clear history so the same flick isn't re-evaluated immediately
      this.pointerHistory = [];
    }
  }

  public triggerSwing(direction: Vector3D, strength: number = 0.7): boolean {
    const success = this.swingState.triggerSwing(direction, strength);
    if (success && this.onSwingTriggered) {
      this.onSwingTriggered(this.swingState.strength, this.swingState.direction);
    }
    return success;
  }

  /**
   * Triggers an immediate forward strike followthrough animation upon ball contact.
   */
  public triggerHitSwing(direction?: Vector3D, strength: number = 0.75): void {
    this.swingState.triggerHitSwing(direction, strength);
    if (this.onSwingTriggered) {
      this.onSwingTriggered(this.swingState.strength, this.swingState.direction);
    }
  }

  public update(dt: number): PlayerInput {
    // 1. Update swing state machine
    this.swingState.update(dt);

    // 2. Base paddle tracking (smoothly moves towards targetPos)
    const smoothing = Math.min(1.0, 36 * dt);
    const cur = this.currentPaddle.pos;
    const prevX = cur.x;
    const prevY = cur.y;

    cur.x += (this.targetPos.x - cur.x) * smoothing;
    cur.y += (this.targetPos.y - cur.y) * smoothing;

    // 3. Apply swing displacement offsets
    const baseZ = PLAYER_PADDLE_Z;
    cur.z = baseZ + this.swingState.offset.z;
    const effectiveX = cur.x + this.swingState.offset.x;
    const effectiveY = cur.y + this.swingState.offset.y;

    // 4. Calculate total paddle velocity (tracking velocity + swing velocity)
    const trackingVx = dt > 0.0001 ? (cur.x - prevX) / dt : 0;
    const trackingVy = dt > 0.0001 ? (cur.y - prevY) / dt : 0;

    this.currentPaddle.vel = {
      x: trackingVx + this.swingState.velocity.x,
      y: trackingVy + this.swingState.velocity.y,
      z: this.swingState.velocity.z
    };

    // 5. Paddle 3D Orientation (tilt)
    // Base natural tilt based on X position and height
    const baseTiltX = -0.12 + (cur.y - TABLE_HEIGHT) * -0.08;
    const baseTiltY = (cur.x / 1.0) * 0.35;
    const baseTiltZ = -(cur.x / 1.0) * 0.22;

    this.currentPaddle.rot = {
      x: baseTiltX + this.swingState.tilt.x,
      y: baseTiltY + this.swingState.tilt.y,
      z: baseTiltZ + this.swingState.tilt.z
    };

    this.currentPaddle.isSwinging = this.swingState.phase !== 'idle';
    this.currentPaddle.swingPhase = this.swingState.phase;

    this.inputSeq++;
    return {
      seq: this.inputSeq,
      timestamp: Date.now(),
      targetPos: { x: effectiveX, y: effectiveY, z: cur.z },
      velocity: { ...this.currentPaddle.vel },
      swingPower: this.swingState.strength,
      isSwinging: this.currentPaddle.isSwinging,
      swingPhase: this.swingState.phase,
      swingDirection: { ...this.swingState.direction }
    };
  }

  public setPosition(x: number, y: number, z: number): void {
    this.targetPos = { x, y, z };
    this.currentPaddle.pos = { x, y, z };
    this.swingState.reset();
  }

  public resetSwing(): void {
    this.swingState.reset();
    this.pointerHistory = [];
  }
}

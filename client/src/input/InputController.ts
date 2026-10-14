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

export class InputController {
  private domElement: HTMLElement;
  private camera: THREE.PerspectiveCamera;

  public targetPos: Vector3D = {
    x: 0.35, // default slightly right forehand
    y: TABLE_HEIGHT + 0.15,
    z: PLAYER_PADDLE_Z
  };

  public currentPaddle: PaddleState = {
    pos: { x: 0.35, y: TABLE_HEIGHT + 0.15, z: PLAYER_PADDLE_Z },
    vel: { x: 0, y: 0, z: 0 },
    rot: { x: -0.1, y: 0.1, z: -0.1 }
  };

  private prevPos: Vector3D = { ...this.targetPos };
  private isPointerDown: boolean = false;
  private inputSeq: number = 0;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private planeZ: THREE.Plane;

  // Smoothing parameter
  public sensitivity: number = 1.0;

  constructor(domElement: HTMLElement, camera: THREE.PerspectiveCamera) {
    this.domElement = domElement;
    this.camera = camera;
    this.planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), -PLAYER_PADDLE_Z);

    this.bindEvents();
  }

  private bindEvents(): void {
    const onPointerMove = (e: PointerEvent) => {
      this.handlePointer(e.clientX, e.clientY);
    };

    const onPointerDown = (e: PointerEvent) => {
      this.isPointerDown = true;
      this.handlePointer(e.clientX, e.clientY);
    };

    const onPointerUp = () => {
      this.isPointerDown = false;
    };

    this.domElement.addEventListener('pointermove', onPointerMove);
    this.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Prevent context menu on right click / long press
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handlePointer(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Normalized Device Coordinates (-1 to +1)
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

    // Raycast onto the paddle plane at Z = PLAYER_PADDLE_Z
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const intersectionPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.planeZ, intersectionPoint);

    if (hit) {
      // Clamp to legal paddle boundaries
      const targetX = Math.max(PADDLE_MIN_X, Math.min(PADDLE_MAX_X, hit.x * this.sensitivity));
      const targetY = Math.max(PADDLE_MIN_Y, Math.min(PADDLE_MAX_Y, hit.y));

      this.targetPos.x = targetX;
      this.targetPos.y = targetY;
    }
  }

  public update(dt: number): PlayerInput {
    // If pointer is held down or swiped forward, push paddle slightly forward for smash/active swing
    const forwardSwing = this.isPointerDown ? -0.15 : 0;
    const targetZ = PLAYER_PADDLE_Z + forwardSwing;

    // Smooth movement towards targetPos
    const smoothing = Math.min(1.0, 24 * dt); // fast crisp response
    const cur = this.currentPaddle.pos;

    cur.x += (this.targetPos.x - cur.x) * smoothing;
    cur.y += (this.targetPos.y - cur.y) * smoothing;
    cur.z += (targetZ - cur.z) * smoothing;

    // Calculate instantaneous paddle velocity
    if (dt > 0.0001) {
      this.currentPaddle.vel = {
        x: (cur.x - this.prevPos.x) / dt,
        y: (cur.y - this.prevPos.y) / dt,
        z: (cur.z - this.prevPos.z) / dt
      };
    }
    this.prevPos = { ...cur };

    // Natural paddle rotation tilt (forehand vs backhand lean)
    const tiltX = -0.15 + (cur.y - TABLE_HEIGHT) * -0.1;
    const tiltY = (cur.x / 1.0) * 0.35;
    const tiltZ = -(cur.x / 1.0) * 0.25;

    this.currentPaddle.rot = {
      x: tiltX,
      y: tiltY,
      z: tiltZ
    };

    this.inputSeq++;
    return {
      seq: this.inputSeq,
      timestamp: Date.now(),
      targetPos: { ...this.currentPaddle.pos },
      velocity: { ...this.currentPaddle.vel },
      swingPower: this.isPointerDown ? 0.9 : 0.4
    };
  }

  public setPosition(x: number, y: number, z: number): void {
    this.targetPos = { x, y, z };
    this.currentPaddle.pos = { x, y, z };
    this.prevPos = { x, y, z };
  }
}

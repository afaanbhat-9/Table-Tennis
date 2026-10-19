import * as THREE from 'three';
import { BALL_RADIUS, TABLE_HEIGHT } from '../../../shared/constants.js';
import { Vector3D } from '../../../shared/types.js';
import { TextureGenerator } from './TextureGenerator.js';

export class BallMesh {
  public mesh: THREE.Mesh;
  public shadowMesh: THREE.Mesh;
  public hitRipple: THREE.Mesh;
  public trailMesh: THREE.Mesh;
  private trailPositions: THREE.Vector3[] = [];
  private readonly MAX_TRAIL_POINTS = 8;
  private rippleTimer: number = 0;

  constructor() {
    // 40mm competition ball (radius 0.02m)
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 40, 32);
    const ballTex = TextureGenerator.createBallTexture();

    // 3-Star competition ball material
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTex,
      roughness: 0.28,
      metalness: 0.04
    });

    this.mesh = new THREE.Mesh(ballGeo, ballMat);
    this.mesh.castShadow = true;

    // Contact shadow blob under the ball for depth perception
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.40)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(0.12, 0.12);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });

    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;

    // Visual hit ripple light removed per user request (clean visual flight)
    this.hitRipple = new THREE.Mesh();
    this.hitRipple.visible = false;

    // Speed trail line removed (clean visual flight)
    this.trailMesh = new THREE.Mesh();
    this.trailMesh.visible = false;
  }

  public triggerHitEffect(_x: number, _y: number, _z: number): void {
    // Light effect removed per user request
    this.hitRipple.visible = false;
  }

  public updatePosition(
    x: number,
    y: number,
    z: number,
    dt: number = 0.016,
    spin?: Vector3D,
    vel?: Vector3D
  ): void {
    this.mesh.position.set(x, y, z);

    // 1. Physical 3D Ball Spin Rotation
    if (spin) {
      this.mesh.rotation.x += spin.x * dt;
      this.mesh.rotation.y += spin.y * dt;
      this.mesh.rotation.z += (spin.z || 0) * dt;
    } else if (vel) {
      // Default rolling rotation
      this.mesh.rotation.x += (vel.z / BALL_RADIUS) * dt * 0.4;
      this.mesh.rotation.z -= (vel.x / BALL_RADIUS) * dt * 0.4;
    }

    // 2. Update contact shadow position and opacity
    const tableTopY = TABLE_HEIGHT + 0.001;
    const isAboveTable = Math.abs(x) <= 0.85 && Math.abs(z) <= 1.45 && y >= TABLE_HEIGHT;

    const shadowY = isAboveTable ? tableTopY : 0.002;
    this.shadowMesh.position.set(x, shadowY, z);

    const heightAboveSurface = Math.max(0.01, y - shadowY);
    const scale = 0.75 + Math.min(2.2, heightAboveSurface * 2.2);
    this.shadowMesh.scale.set(scale, scale, 1);

    const opacity = Math.max(0.08, 0.80 - heightAboveSurface * 0.85);
    (this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = opacity;


  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
    this.shadowMesh.visible = visible;
    if (!visible) {
      this.hitRipple.visible = false;
      this.trailMesh.visible = false;
      this.trailPositions = [];
    }
  }
}

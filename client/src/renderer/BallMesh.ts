import * as THREE from 'three';
import { BALL_RADIUS, TABLE_HEIGHT } from '../../../shared/constants.js';

export class BallMesh {
  public mesh: THREE.Mesh;
  public shadowMesh: THREE.Mesh;
  public hitRipple: THREE.Mesh;
  private rippleTimer: number = 0;

  constructor() {
    // 40mm ball (radius 0.02m)
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 24);
    // Competition 3-star ball with matte celluloid finish
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffdf4a,
      roughness: 0.35,
      metalness: 0.02
    });

    this.mesh = new THREE.Mesh(ballGeo, ballMat);
    this.mesh.castShadow = true;

    // Contact shadow blob under the ball for depth perception
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
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

    // Visual hit ripple ring
    const rippleGeo = new THREE.RingGeometry(0.02, 0.04, 32);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0xffea79,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.hitRipple = new THREE.Mesh(rippleGeo, rippleMat);
    this.hitRipple.visible = false;
  }

  public triggerHitEffect(x: number, y: number, z: number): void {
    this.hitRipple.position.set(x, y, z);
    this.hitRipple.scale.set(1, 1, 1);
    (this.hitRipple.material as THREE.MeshBasicMaterial).opacity = 0.85;
    this.hitRipple.visible = true;
    this.rippleTimer = 0.15; // 150ms ripple duration
  }

  public updatePosition(x: number, y: number, z: number, dt: number = 0.016): void {
    this.mesh.position.set(x, y, z);

    // Update shadow position directly beneath the ball on the table (or floor if off-table)
    const tableTopY = TABLE_HEIGHT + 0.001;
    const isAboveTable = Math.abs(x) <= 0.85 && Math.abs(z) <= 1.45 && y >= TABLE_HEIGHT;

    const shadowY = isAboveTable ? tableTopY : 0.002;
    this.shadowMesh.position.set(x, shadowY, z);

    const heightAboveSurface = Math.max(0.01, y - shadowY);
    const scale = 0.8 + Math.min(2.0, heightAboveSurface * 2.5);
    this.shadowMesh.scale.set(scale, scale, 1);

    const opacity = Math.max(0.1, 0.75 - heightAboveSurface * 0.8);
    (this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = opacity;

    // Update hit ripple animation
    if (this.rippleTimer > 0) {
      this.rippleTimer -= dt;
      const progress = 1 - Math.max(0, this.rippleTimer / 0.15);
      const ringScale = 1.0 + progress * 2.5;
      this.hitRipple.scale.set(ringScale, ringScale, ringScale);
      (this.hitRipple.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.85;

      if (this.rippleTimer <= 0) {
        this.hitRipple.visible = false;
      }
    }
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
    this.shadowMesh.visible = visible;
    if (!visible) this.hitRipple.visible = false;
  }
}

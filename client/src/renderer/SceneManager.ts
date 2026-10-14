import * as THREE from 'three';
import { TableMesh } from './TableMesh.js';
import { GymnasiumMesh } from './GymnasiumMesh.js';
import { PaddleMesh } from './PaddleMesh.js';
import { BallMesh } from './BallMesh.js';
import { BallState, PaddleState, Vector3D } from '../../../shared/types.js';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public table: TableMesh;
  public gym: GymnasiumMesh;
  public playerPaddle: PaddleMesh;
  public opponentPaddle: PaddleMesh;
  public ball: BallMesh;

  private container: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbab09e);

    // 2. Camera: Zoomed out ~18% for comfortable elevated view
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 50);
    this.resetCamera();

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    container.appendChild(this.renderer.domElement);

    // 4. Build Environment & Objects
    this.gym = new GymnasiumMesh();
    this.scene.add(this.gym.group);

    this.table = new TableMesh();
    this.scene.add(this.table.group);

    // Player 1 (Red) Paddle
    this.playerPaddle = new PaddleMesh(true);
    this.scene.add(this.playerPaddle.group);

    // Player 2 / AI (Green) Paddle
    this.opponentPaddle = new PaddleMesh(false);
    this.scene.add(this.opponentPaddle.group);

    // Ball & Shadow & Hit Ripple
    this.ball = new BallMesh();
    this.scene.add(this.ball.mesh);
    this.scene.add(this.ball.shadowMesh);
    this.scene.add(this.ball.hitRipple);

    this.setupResize();
  }

  public resetCamera(): void {
    // Zoomed out view (~18%) with natural elevated perspective
    this.camera.position.set(0, 1.48, 2.88);
    this.camera.lookAt(0, 0.74, -0.45);
  }

  private setupResize(): void {
    const onResize = () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width === 0 || height === 0) return;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };

    window.addEventListener('resize', onResize);
    this.resizeObserver = new ResizeObserver(onResize);
    this.resizeObserver.observe(this.container);
  }

  public triggerHitEffect(pos?: Vector3D): void {
    if (pos) {
      this.ball.triggerHitEffect(pos.x, pos.y, pos.z);
    } else {
      this.ball.triggerHitEffect(this.ball.mesh.position.x, this.ball.mesh.position.y, this.ball.mesh.position.z);
    }
  }

  public updateGameState(ball: BallState, p1Paddle: PaddleState, p2Paddle: PaddleState, dt: number = 0.016): void {
    // Update Ball
    this.ball.updatePosition(ball.pos.x, ball.pos.y, ball.pos.z, dt);
    this.ball.setVisible(ball.active);

    // Update Player 1 Paddle
    this.playerPaddle.updatePosition(
      p1Paddle.pos.x,
      p1Paddle.pos.y,
      p1Paddle.pos.z,
      p1Paddle.rot.x,
      p1Paddle.rot.y,
      p1Paddle.rot.z
    );

    // Update Player 2 Paddle
    this.opponentPaddle.updatePosition(
      p2Paddle.pos.x,
      p2Paddle.pos.y,
      p2Paddle.pos.z,
      p2Paddle.rot.x,
      p2Paddle.rot.y,
      p2Paddle.rot.z
    );
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

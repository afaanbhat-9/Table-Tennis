import * as THREE from 'three';
import { PADDLE_RADIUS, PADDLE_THICKNESS, PADDLE_HANDLE_LENGTH } from '../../../shared/constants.js';
import { TextureGenerator } from './TextureGenerator.js';

export class PaddleMesh {
  public group: THREE.Group;
  private bladeMesh: THREE.Mesh;
  private handleMesh: THREE.Mesh;

  constructor(isPlayer: boolean = true) {
    this.group = new THREE.Group();

    // Racket blade (oval cylinder)
    const bladeGeo = new THREE.CylinderGeometry(
      PADDLE_RADIUS,
      PADDLE_RADIUS,
      PADDLE_THICKNESS,
      32
    );
    bladeGeo.rotateX(Math.PI / 2); // face along Z axis

    // Red rubber face for player (matching reference image), green rubber for opponent
    const rubberColor = isPlayer ? '#d92c2c' : '#1f9457';
    const rubberTex = TextureGenerator.createPaddleRubberTexture(rubberColor);

    const rubberMat = new THREE.MeshStandardMaterial({
      map: rubberTex,
      roughness: 0.45,
      metalness: 0.05
    });

    const blackRubberMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.5,
      metalness: 0.05
    });

    const woodEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xd9b382,
      roughness: 0.6,
      metalness: 0.0
    });

    // Multi-material: rim wood, front rubber, back black rubber
    const materials: THREE.Material[] = [
      woodEdgeMat,     // rim
      rubberMat,       // front face (red/green)
      blackRubberMat   // back face (black)
    ];

    this.bladeMesh = new THREE.Mesh(bladeGeo, materials);
    this.bladeMesh.castShadow = true;
    this.group.add(this.bladeMesh);

    // Wooden handle
    const handleGeo = new THREE.BoxGeometry(0.028, PADDLE_HANDLE_LENGTH, 0.022);
    // Bevel the bottom slightly
    const woodHandleMat = new THREE.MeshStandardMaterial({
      color: 0xd9a86c,
      roughness: 0.5,
      metalness: 0.0
    });

    this.handleMesh = new THREE.Mesh(handleGeo, woodHandleMat);
    // Position handle extending downwards from blade bottom
    this.handleMesh.position.set(0, -PADDLE_RADIUS - PADDLE_HANDLE_LENGTH / 2 + 0.015, 0);
    this.handleMesh.castShadow = true;
    this.group.add(this.handleMesh);

    // If opponent, flip handle so it faces towards player
    if (!isPlayer) {
      this.group.rotation.y = Math.PI;
    }
  }

  public updatePosition(x: number, y: number, z: number, rx: number = 0, ry: number = 0, rz: number = 0): void {
    this.group.position.set(x, y, z);
    this.group.rotation.x = rx;
    this.group.rotation.y = ry;
    this.group.rotation.z = rz;
  }
}

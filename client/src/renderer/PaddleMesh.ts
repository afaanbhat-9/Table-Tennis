import * as THREE from 'three';
import { PADDLE_RADIUS, PADDLE_THICKNESS, PADDLE_HANDLE_LENGTH } from '../../../shared/constants.js';
import { TextureGenerator } from './TextureGenerator.js';

export class PaddleMesh {
  public group: THREE.Group;
  private bladeMesh: THREE.Mesh;
  private handleMesh: THREE.Mesh;
  private edgeTapeMesh: THREE.Mesh;

  constructor(isPlayer: boolean = true) {
    this.group = new THREE.Group();

    // 1. Racket blade (authentic slightly oval shape)
    const bladeGeo = new THREE.CylinderGeometry(
      PADDLE_RADIUS,
      PADDLE_RADIUS,
      PADDLE_THICKNESS,
      36
    );
    bladeGeo.rotateX(Math.PI / 2); // face along Z axis
    bladeGeo.scale(1.0, 1.06, 1.0); // subtle oval ratio

    // Red rubber face for player, green rubber for opponent
    const rubberColor = isPlayer ? '#d42828' : '#1c8c4f';
    const rubberTex = TextureGenerator.createPaddleRubberTexture(rubberColor);

    const rubberMat = new THREE.MeshStandardMaterial({
      map: rubberTex,
      roughness: 0.4,
      metalness: 0.04
    });

    const blackRubberMat = new THREE.MeshStandardMaterial({
      color: 0x151618,
      roughness: 0.45,
      metalness: 0.04
    });

    const woodEdgeMat = new THREE.MeshStandardMaterial({
      color: 0x222222, // protective edge tape
      roughness: 0.6,
      metalness: 0.1
    });

    const materials: THREE.Material[] = [
      woodEdgeMat,     // rim with tape
      rubberMat,       // front face (red/green)
      blackRubberMat   // back face (black)
    ];

    this.bladeMesh = new THREE.Mesh(bladeGeo, materials);
    this.bladeMesh.castShadow = true;
    this.group.add(this.bladeMesh);

    // 2. Gold decorative edge stripe on tape
    const tapeGeo = new THREE.CylinderGeometry(
      PADDLE_RADIUS + 0.0005,
      PADDLE_RADIUS + 0.0005,
      0.003,
      36,
      1,
      true
    );
    tapeGeo.rotateX(Math.PI / 2);
    tapeGeo.scale(1.0, 1.06, 1.0);
    const goldTapeMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.8,
      roughness: 0.3
    });
    this.edgeTapeMesh = new THREE.Mesh(tapeGeo, goldTapeMat);
    this.group.add(this.edgeTapeMesh);

    // 3. Ergonomic Flared Wooden Handle
    const handleGeo = new THREE.BoxGeometry(0.026, PADDLE_HANDLE_LENGTH, 0.022);
    const woodHandleMat = new THREE.MeshStandardMaterial({
      color: 0xd4a56c,
      roughness: 0.45,
      metalness: 0.02
    });

    this.handleMesh = new THREE.Mesh(handleGeo, woodHandleMat);
    this.handleMesh.position.set(0, -PADDLE_RADIUS * 1.06 - PADDLE_HANDLE_LENGTH / 2 + 0.015, 0);
    this.handleMesh.castShadow = true;
    this.group.add(this.handleMesh);

    // Flared grip caps on handle
    const gripCapGeo = new THREE.BoxGeometry(0.029, 0.02, 0.025);
    const gripCap = new THREE.Mesh(gripCapGeo, woodHandleMat);
    gripCap.position.set(0, -PADDLE_RADIUS * 1.06 - PADDLE_HANDLE_LENGTH + 0.02, 0);
    this.group.add(gripCap);

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

import * as THREE from 'three';
import { PADDLE_RADIUS, PADDLE_THICKNESS, PADDLE_HANDLE_LENGTH } from '../../../shared/constants.js';
import { TextureGenerator } from './TextureGenerator.js';

export class PaddleMesh {
  public group: THREE.Group;
  private bladeMesh: THREE.Mesh;
  private spongeMesh: THREE.Mesh;
  private handleMesh: THREE.Mesh;
  private isPlayer: boolean;

  constructor(isPlayer: boolean = true) {
    this.isPlayer = isPlayer;
    this.group = new THREE.Group();

    // 1. 7-Ply Wood Blade Core
    const bladeGeo = new THREE.CylinderGeometry(
      PADDLE_RADIUS,
      PADDLE_RADIUS,
      PADDLE_THICKNESS,
      48
    );
    bladeGeo.rotateX(Math.PI / 2); // face along Z axis
    bladeGeo.scale(1.0, 1.06, 1.0); // authentic subtle oval shape

    // Front Rubber: Crimson red for player (#cb2828), Electric Cyan for opponent
    const rubberColor = isPlayer ? '#cb2828' : '#00b8d9';
    const rubberTex = TextureGenerator.createPaddleRubberTexture(rubberColor, isPlayer);

    const frontRubberMat = new THREE.MeshStandardMaterial({
      map: rubberTex,
      roughness: 0.38,
      metalness: 0.02
    });

    const blackRubberMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.38,
      metalness: 0.02
    });

    // 5-ply natural birch wood core side edge matching reference image
    const woodCoreMat = new THREE.MeshStandardMaterial({
      color: 0xdec49a,
      roughness: 0.55,
      metalness: 0.05
    });

    const materials: THREE.Material[] = [
      woodCoreMat,     // rim
      frontRubberMat,  // front face (+Z)
      blackRubberMat   // back face (-Z)
    ];

    this.bladeMesh = new THREE.Mesh(bladeGeo, materials);
    this.bladeMesh.castShadow = true;
    this.bladeMesh.receiveShadow = true;
    this.group.add(this.bladeMesh);

    // 2. High-Density Sponge Layer (Vermilion 2.1mm sponge under rubber)
    const spongeGeo = new THREE.CylinderGeometry(
      PADDLE_RADIUS + 0.0002,
      PADDLE_RADIUS + 0.0002,
      PADDLE_THICKNESS + 0.0015,
      48,
      1,
      true
    );
    spongeGeo.rotateX(Math.PI / 2);
    spongeGeo.scale(1.0, 1.06, 1.0);
    const spongeMat = new THREE.MeshStandardMaterial({
      color: isPlayer ? 0xd65129 : 0x00d4ff,
      roughness: 0.75,
      metalness: 0.0
    });
    this.spongeMesh = new THREE.Mesh(spongeGeo, spongeMat);
    this.group.add(this.spongeMesh);

    // 4. Ergonomic Flared Striped Hardwood Handle
    const handleGeo = new THREE.BoxGeometry(0.028, PADDLE_HANDLE_LENGTH, 0.024);
    const handleTex = TextureGenerator.createHandleTexture();
    const woodHandleMat = new THREE.MeshStandardMaterial({
      map: handleTex,
      roughness: 0.38,
      metalness: 0.05
    });

    const handleTilt = isPlayer ? -0.42 : 0.42;
    const handleZOffset = isPlayer ? 0.032 : -0.032;

    this.handleMesh = new THREE.Mesh(handleGeo, woodHandleMat);
    this.handleMesh.position.set(0, -PADDLE_RADIUS * 1.06 - PADDLE_HANDLE_LENGTH / 2 + 0.016, handleZOffset);
    this.handleMesh.rotation.x = handleTilt;
    this.handleMesh.castShadow = true;
    this.group.add(this.handleMesh);

    // Flared ergonomic butt cap on handle
    const gripCapGeo = new THREE.BoxGeometry(0.032, 0.022, 0.028);
    const gripCap = new THREE.Mesh(gripCapGeo, woodHandleMat);
    const capZOffset = isPlayer ? 0.052 : -0.052;
    gripCap.position.set(0, -PADDLE_RADIUS * 1.06 - PADDLE_HANDLE_LENGTH + 0.022, capZOffset);
    gripCap.rotation.x = handleTilt;
    gripCap.castShadow = true;
    this.group.add(gripCap);

    // Acrylic metallic brand lens emblem on handle base
    const lensGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.002, 16);
    lensGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.1
    });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.position.set(0, -PADDLE_RADIUS * 1.06 - PADDLE_HANDLE_LENGTH + 0.022, capZOffset + (isPlayer ? 0.015 : -0.015));
    lensMesh.rotation.x = handleTilt;
    this.group.add(lensMesh);

    if (!isPlayer) {
      this.group.rotation.y = Math.PI;
    }
  }

  public updatePosition(x: number, y: number, z: number, rx: number = 0, ry: number = 0, rz: number = 0): void {
    this.group.position.set(x, y, z);
    this.group.rotation.x = rx;
    this.group.rotation.y = this.isPlayer ? ry : Math.PI - ry;
    this.group.rotation.z = this.isPlayer ? rz : -rz;
  }
}

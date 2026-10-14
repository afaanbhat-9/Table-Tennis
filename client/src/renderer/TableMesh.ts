import * as THREE from 'three';
import {
  TABLE_WIDTH,
  TABLE_LENGTH,
  TABLE_HEIGHT,
  TABLE_THICKNESS,
  NET_HEIGHT,
  NET_WIDTH,
  NET_OVERHANG
} from '../../../shared/constants.js';
import { TextureGenerator } from './TextureGenerator.js';

export class TableMesh {
  public group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.buildTable();
    this.buildNet();
    this.buildShadow();
  }

  private buildTable(): void {
    // 1. Table Top Surface
    const topGeometry = new THREE.BoxGeometry(
      TABLE_WIDTH,
      TABLE_THICKNESS,
      TABLE_LENGTH
    );

    const tableTexture = TextureGenerator.createTableTexture();
    const purpleSideMat = new THREE.MeshStandardMaterial({
      color: 0x683ea0,
      roughness: 0.35,
      metalness: 0.05
    });

    // Multi-material: top face has markings texture, edges have solid purple/slate
    const materials: THREE.Material[] = [
      purpleSideMat, // right (+X)
      purpleSideMat, // left (-X)
      new THREE.MeshStandardMaterial({
        map: tableTexture,
        roughness: 0.3,
        metalness: 0.05
      }), // top (+Y)
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }), // bottom (-Y)
      purpleSideMat, // front (+Z)
      purpleSideMat  // back (-Z)
    ];

    const tableTop = new THREE.Mesh(topGeometry, materials);
    tableTop.position.y = TABLE_HEIGHT - TABLE_THICKNESS / 2;
    tableTop.receiveShadow = true;
    tableTop.castShadow = true;
    this.group.add(tableTop);

    // 2. Table Apron / Under-frame (grey metallic rim under the purple top)
    const apronDepth = 0.05;
    const apronThickness = 0.02;
    const apronMat = new THREE.MeshStandardMaterial({
      color: 0x474c57,
      roughness: 0.4,
      metalness: 0.5
    });

    // Left & Right aprons
    const sideApronGeo = new THREE.BoxGeometry(apronThickness, apronDepth, TABLE_LENGTH - 0.04);
    const leftApron = new THREE.Mesh(sideApronGeo, apronMat);
    leftApron.position.set(-TABLE_WIDTH / 2 + apronThickness / 2 + 0.01, TABLE_HEIGHT - TABLE_THICKNESS - apronDepth / 2, 0);
    this.group.add(leftApron);

    const rightApron = new THREE.Mesh(sideApronGeo, apronMat);
    rightApron.position.set(TABLE_WIDTH / 2 - apronThickness / 2 - 0.01, TABLE_HEIGHT - TABLE_THICKNESS - apronDepth / 2, 0);
    this.group.add(rightApron);

    // Front & Back aprons
    const endApronGeo = new THREE.BoxGeometry(TABLE_WIDTH - 0.04, apronDepth, apronThickness);
    const frontApron = new THREE.Mesh(endApronGeo, apronMat);
    frontApron.position.set(0, TABLE_HEIGHT - TABLE_THICKNESS - apronDepth / 2, TABLE_LENGTH / 2 - apronThickness / 2 - 0.01);
    this.group.add(frontApron);

    const backApron = new THREE.Mesh(endApronGeo, apronMat);
    backApron.position.set(0, TABLE_HEIGHT - TABLE_THICKNESS - apronDepth / 2, -TABLE_LENGTH / 2 + apronThickness / 2 + 0.01);
    this.group.add(backApron);

    // 3. Sturdy Legs & Braces (Black square steel legs matching reference image)
    const legWidth = 0.06;
    const legHeight = TABLE_HEIGHT - TABLE_THICKNESS;
    const legGeo = new THREE.BoxGeometry(legWidth, legHeight, legWidth);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x181a1e,
      roughness: 0.5,
      metalness: 0.6
    });

    const legInsetX = TABLE_WIDTH / 2 - 0.14;
    const legInsetZ = TABLE_LENGTH / 2 - 0.22;

    const legPositions = [
      [-legInsetX, -legInsetZ], // far left
      [legInsetX, -legInsetZ],  // far right
      [-legInsetX, legInsetZ],  // near left
      [legInsetX, legInsetZ],   // near right
      [-legInsetX, 0],          // center left
      [legInsetX, 0]            // center right
    ];

    for (const [lx, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, legHeight / 2, lz);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.group.add(leg);
    }

    // Cross brace bars between legs
    const braceGeo = new THREE.BoxGeometry(TABLE_WIDTH - 0.28, 0.03, 0.03);
    const nearBrace = new THREE.Mesh(braceGeo, legMat);
    nearBrace.position.set(0, 0.18, legInsetZ);
    this.group.add(nearBrace);

    const farBrace = new THREE.Mesh(braceGeo, legMat);
    farBrace.position.set(0, 0.18, -legInsetZ);
    this.group.add(farBrace);
  }

  private buildNet(): void {
    // Net Mesh
    const netTexture = TextureGenerator.createNetTexture();
    const netGeo = new THREE.PlaneGeometry(NET_WIDTH, NET_HEIGHT);
    const netMat = new THREE.MeshStandardMaterial({
      map: netTexture,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.6,
      depthWrite: false
    });

    const netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set(0, TABLE_HEIGHT + NET_HEIGHT / 2, 0);
    this.group.add(netMesh);

    // Support Posts
    const postRadius = 0.012;
    const postHeight = NET_HEIGHT + 0.02;
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x2b3038,
      roughness: 0.4,
      metalness: 0.7
    });

    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(-NET_WIDTH / 2, TABLE_HEIGHT + postHeight / 2 - 0.01, 0);
    this.group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(NET_WIDTH / 2, TABLE_HEIGHT + postHeight / 2 - 0.01, 0);
    this.group.add(rightPost);

    // Post table clamp brackets
    const clampGeo = new THREE.BoxGeometry(0.04, 0.08, 0.05);
    const leftClamp = new THREE.Mesh(clampGeo, postMat);
    leftClamp.position.set(-TABLE_WIDTH / 2 - 0.02, TABLE_HEIGHT - 0.02, 0);
    this.group.add(leftClamp);

    const rightClamp = new THREE.Mesh(clampGeo, postMat);
    rightClamp.position.set(TABLE_WIDTH / 2 + 0.02, TABLE_HEIGHT - 0.02, 0);
    this.group.add(rightClamp);
  }

  private buildShadow(): void {
    // Soft diffuse contact shadow on the floor underneath the table (matching reference image)
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(256, 256, 50, 256, 256, 250);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(TABLE_WIDTH * 1.5, TABLE_LENGTH * 1.3);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });

    const floorShadow = new THREE.Mesh(shadowGeo, shadowMat);
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.position.set(0, 0.002, 0);
    this.group.add(floorShadow);
  }
}

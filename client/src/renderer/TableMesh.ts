import * as THREE from 'three';
import {
  TABLE_WIDTH,
  TABLE_LENGTH,
  TABLE_HEIGHT,
  TABLE_THICKNESS,
  NET_HEIGHT,
  NET_WIDTH
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
    const tableSideMat = new THREE.MeshStandardMaterial({
      color: 0x007a91,
      roughness: 0.38,
      metalness: 0.05
    });

    const materials: THREE.Material[] = [
      tableSideMat, // right (+X)
      tableSideMat, // left (-X)
      new THREE.MeshStandardMaterial({
        map: tableTexture,
        roughness: 0.35,
        metalness: 0.04
      }), // top (+Y)
      new THREE.MeshStandardMaterial({ color: 0x1f1f22, roughness: 0.85 }), // bottom (-Y)
      tableSideMat, // front (+Z)
      tableSideMat  // back (-Z)
    ];

    const tableTop = new THREE.Mesh(topGeometry, materials);
    tableTop.position.y = TABLE_HEIGHT - TABLE_THICKNESS / 2;
    tableTop.receiveShadow = true;
    tableTop.castShadow = true;
    this.group.add(tableTop);

    // 2. Corner Protection Brackets (Dark metallic caps on 4 corners)
    const capSize = 0.035;
    const capThickness = TABLE_THICKNESS + 0.004;
    const cornerCapGeo = new THREE.BoxGeometry(capSize, capThickness, capSize);
    const cornerCapMat = new THREE.MeshStandardMaterial({
      color: 0x22262e,
      roughness: 0.35,
      metalness: 0.8
    });

    const cornerOffsets = [
      [-TABLE_WIDTH / 2 + capSize / 2, -TABLE_LENGTH / 2 + capSize / 2],
      [TABLE_WIDTH / 2 - capSize / 2, -TABLE_LENGTH / 2 + capSize / 2],
      [-TABLE_WIDTH / 2 + capSize / 2, TABLE_LENGTH / 2 - capSize / 2],
      [TABLE_WIDTH / 2 - capSize / 2, TABLE_LENGTH / 2 - capSize / 2]
    ];

    for (const [cx, cz] of cornerOffsets) {
      const cap = new THREE.Mesh(cornerCapGeo, cornerCapMat);
      cap.position.set(cx, TABLE_HEIGHT - TABLE_THICKNESS / 2, cz);
      this.group.add(cap);
    }

    // 3. Table Apron / Under-frame (crisp anodized silver metallic frame under top)
    const apronDepth = 0.05;
    const apronThickness = 0.022;
    const apronMat = new THREE.MeshStandardMaterial({
      color: 0xd1d7e0,
      roughness: 0.3,
      metalness: 0.75
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

    // 4. Sturdy Competition Legs & Undercarriage
    const legWidth = 0.06;
    const legHeight = TABLE_HEIGHT - TABLE_THICKNESS;
    const legGeo = new THREE.BoxGeometry(legWidth, legHeight, legWidth);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x16181c,
      roughness: 0.45,
      metalness: 0.7
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

      // Rubber foot pad
      const footGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.015, 16);
      const footMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(lx, 0.008, lz);
      this.group.add(foot);
    }

    // Heavy-duty cross-braces
    const braceGeo = new THREE.BoxGeometry(TABLE_WIDTH - 0.28, 0.03, 0.03);
    const nearBrace = new THREE.Mesh(braceGeo, legMat);
    nearBrace.position.set(0, 0.18, legInsetZ);
    this.group.add(nearBrace);

    const farBrace = new THREE.Mesh(braceGeo, legMat);
    farBrace.position.set(0, 0.18, -legInsetZ);
    this.group.add(farBrace);

    const centerBraceGeo = new THREE.BoxGeometry(0.03, 0.03, TABLE_LENGTH - 0.44);
    const centerBrace = new THREE.Mesh(centerBraceGeo, legMat);
    centerBrace.position.set(0, 0.18, 0);
    this.group.add(centerBrace);
  }

  private buildNet(): void {
    const netTexture = TextureGenerator.createNetTexture();
    const netGeo = new THREE.PlaneGeometry(NET_WIDTH, NET_HEIGHT);
    const netMat = new THREE.MeshStandardMaterial({
      map: netTexture,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.55,
      depthWrite: false
    });

    const netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set(0, TABLE_HEIGHT + NET_HEIGHT / 2, 0);
    this.group.add(netMesh);

    // Support Posts with metallic finish
    const postRadius = 0.012;
    const postHeight = NET_HEIGHT + 0.025;
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      roughness: 0.35,
      metalness: 0.8
    });

    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(-NET_WIDTH / 2, TABLE_HEIGHT + postHeight / 2 - 0.01, 0);
    this.group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(NET_WIDTH / 2, TABLE_HEIGHT + postHeight / 2 - 0.01, 0);
    this.group.add(rightPost);

    // Tension thumbscrews on top of posts
    const knobGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.01, 16);
    const knobMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.2 });

    const leftKnob = new THREE.Mesh(knobGeo, knobMat);
    leftKnob.position.set(-NET_WIDTH / 2, TABLE_HEIGHT + postHeight, 0);
    this.group.add(leftKnob);

    const rightKnob = new THREE.Mesh(knobGeo, knobMat);
    rightKnob.position.set(NET_WIDTH / 2, TABLE_HEIGHT + postHeight, 0);
    this.group.add(rightKnob);

    // Table clamp brackets
    const clampGeo = new THREE.BoxGeometry(0.04, 0.08, 0.05);
    const leftClamp = new THREE.Mesh(clampGeo, postMat);
    leftClamp.position.set(-TABLE_WIDTH / 2 - 0.02, TABLE_HEIGHT - 0.02, 0);
    this.group.add(leftClamp);

    const rightClamp = new THREE.Mesh(clampGeo, postMat);
    rightClamp.position.set(TABLE_WIDTH / 2 + 0.02, TABLE_HEIGHT - 0.02, 0);
    this.group.add(rightClamp);
  }

  private buildShadow(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(256, 256, 50, 256, 256, 250);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.40)');
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

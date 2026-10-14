import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

export class GymnasiumMesh {
  public group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.buildFloor();
    this.buildBackWall();
    this.buildLighting();
  }

  private buildFloor(): void {
    const floorTex = TextureGenerator.createGymFloorTexture();
    const floorGeo = new THREE.PlaneGeometry(18, 26);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.28,
      metalness: 0.08
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  private buildBackWall(): void {
    const wallTex = TextureGenerator.createGymWallTexture();
    const wallGeo = new THREE.PlaneGeometry(18, 8);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.7,
      metalness: 0.05
    });

    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 4, -6.0); // 6 meters behind center of table
    backWall.receiveShadow = true;
    this.group.add(backWall);

    // Left and right gym walls
    const sideWallGeo = new THREE.PlaneGeometry(26, 8);
    const sideWallMat = new THREE.MeshStandardMaterial({
      color: 0xc4b9a5,
      roughness: 0.8
    });

    const leftWall = new THREE.Mesh(sideWallGeo, sideWallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-9, 4, 0);
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, sideWallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(9, 4, 0);
    this.group.add(rightWall);
  }

  private buildBarriers(): void {
    // Competition court surrounds (classic blue table tennis barriers in the background)
    const barrierHeight = 0.72;
    const barrierDepth = 0.03;
    const barrierLength = 2.2;

    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.5,
      metalness: 0.1
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.4,
      metalness: 0.8
    });

    // Create 3 back court barriers across Z = -4.2
    for (let i = -1; i <= 1; i++) {
      const bGroup = new THREE.Group();
      const panelGeo = new THREE.BoxGeometry(barrierLength, barrierHeight, barrierDepth);
      const panel = new THREE.Mesh(panelGeo, barrierMat);
      panel.position.y = barrierHeight / 2 + 0.02;
      panel.castShadow = true;
      panel.receiveShadow = true;
      bGroup.add(panel);

      // Steel feet
      const footGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8);
      footGeo.rotateX(Math.PI / 2);
      const footL = new THREE.Mesh(footGeo, frameMat);
      footL.position.set(-barrierLength / 2 + 0.15, 0.015, 0);
      bGroup.add(footL);

      const footR = new THREE.Mesh(footGeo, frameMat);
      footR.position.set(barrierLength / 2 - 0.15, 0.015, 0);
      bGroup.add(footR);

      bGroup.position.set(i * (barrierLength + 0.08), 0, -4.2);
      this.group.add(bGroup);
    }
  }

  private buildLighting(): void {
    // 1. Warm ambient light
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.8);
    this.group.add(ambientLight);

    // 2. Main overhead stadium light (matching reference image specular sheen)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.15);
    mainLight.position.set(0, 5.0, 2.2);
    mainLight.target.position.set(0, 0.76, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 12;
    mainLight.shadow.camera.left = -2.2;
    mainLight.shadow.camera.right = 2.2;
    mainLight.shadow.camera.top = 3.0;
    mainLight.shadow.camera.bottom = -3.0;
    mainLight.shadow.bias = -0.0004;

    this.group.add(mainLight);
    this.group.add(mainLight.target);

    // 3. Far table fill light
    const farFill = new THREE.DirectionalLight(0xffeedd, 0.5);
    farFill.position.set(0, 3.8, -3.8);
    farFill.target.position.set(0, 0.76, -1.0);
    this.group.add(farFill);
    this.group.add(farFill.target);

    // 4. Center table point light to enhance table top gloss
    const tableGlow = new THREE.PointLight(0xf0e8ff, 0.65, 6);
    tableGlow.position.set(0, 2.3, 0);
    this.group.add(tableGlow);
  }
}

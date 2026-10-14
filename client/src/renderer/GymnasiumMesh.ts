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
    const floorGeo = new THREE.PlaneGeometry(16, 24);
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
    const wallGeo = new THREE.PlaneGeometry(16, 8);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.7,
      metalness: 0.05
    });

    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 4, -6.0); // 6 meters behind center of table
    backWall.receiveShadow = true;
    this.group.add(backWall);

    // Left and right gym walls to enclose the hall
    const sideWallGeo = new THREE.PlaneGeometry(24, 8);
    const sideWallMat = new THREE.MeshStandardMaterial({
      color: 0xc4b9a5,
      roughness: 0.8
    });

    const leftWall = new THREE.Mesh(sideWallGeo, sideWallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-8, 4, 0);
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, sideWallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(8, 4, 0);
    this.group.add(rightWall);
  }

  private buildLighting(): void {
    // 1. Warm ambient light
    const ambientLight = new THREE.AmbientLight(0xfff6ea, 0.75);
    this.group.add(ambientLight);

    // 2. Main overhead stadium light (matching reference image specular sheen)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.1);
    mainLight.position.set(0, 4.5, 2.0);
    mainLight.target.position.set(0, 0.76, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 10;
    mainLight.shadow.camera.left = -2;
    mainLight.shadow.camera.right = 2;
    mainLight.shadow.camera.top = 2.5;
    mainLight.shadow.camera.bottom = -2.5;
    mainLight.shadow.bias = -0.0005;

    this.group.add(mainLight);
    this.group.add(mainLight.target);

    // 3. Far table fill light
    const farFill = new THREE.DirectionalLight(0xffeedd, 0.45);
    farFill.position.set(0, 3.5, -3.5);
    farFill.target.position.set(0, 0.76, -1.0);
    this.group.add(farFill);
    this.group.add(farFill.target);

    // 4. Subtle center table point light to enhance table top gloss
    const tableGlow = new THREE.PointLight(0xf0e6ff, 0.6, 5);
    tableGlow.position.set(0, 2.2, 0);
    this.group.add(tableGlow);
  }
}

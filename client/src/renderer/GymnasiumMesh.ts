import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

export class GymnasiumMesh {
  public group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.buildFloor();
    this.buildWalls();
    this.buildLighting();
  }

  /**
   * Warm, glossy anime school gymnasium wooden parquet/plank floor.
   */
  private buildFloor(): void {
    const floorTex = TextureGenerator.createTournamentFloorTexture();
    const floorGeo = new THREE.PlaneGeometry(26, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.32,
      metalness: 0.05
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  /**
   * Authentic table tennis gymnasium sports hall walls:
   * Architectural cream upper wall with high clerestory windows, wall clock, and tournament plaque,
   * warm honey-oak lower wainscoting with wood moulding, equipment doorway, and Swedish wall bars.
   */
  private buildWalls(): void {
    const wallGroup = new THREE.Group();

    const wallHeight = 8.2;
    const wallWidth = 26.0;
    const wallDepth = -5.8;

    // 1. Back Wall Mesh
    const backWallTex = TextureGenerator.createGymWallTexture();
    const backWallGeo = new THREE.PlaneGeometry(wallWidth, wallHeight);
    const backWallMat = new THREE.MeshStandardMaterial({
      map: backWallTex,
      roughness: 0.65,
      metalness: 0.04
    });

    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(0, wallHeight / 2, wallDepth);
    backWall.receiveShadow = true;
    wallGroup.add(backWall);

    // 2. Back Wall 3D Moulding Trim
    // Dark timber baseboard along floor
    const baseboardGeo = new THREE.BoxGeometry(wallWidth, 0.28, 0.08);
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: 0x482810,
      roughness: 0.45,
      metalness: 0.1
    });
    const baseboard = new THREE.Mesh(baseboardGeo, baseboardMat);
    baseboard.position.set(0, 0.14, wallDepth + 0.04);
    wallGroup.add(baseboard);

    // Dado rail moulding separating upper and lower wall
    const dadoGeo = new THREE.BoxGeometry(wallWidth, 0.08, 0.05);
    const dadoMat = new THREE.MeshStandardMaterial({
      color: 0x5a3214,
      roughness: 0.4,
      metalness: 0.1
    });
    const dado = new THREE.Mesh(dadoGeo, dadoMat);
    dado.position.set(0, 1.71, wallDepth + 0.03);
    wallGroup.add(dado);

    // 3. Side Walls (Left and Right court enclosure)
    const sideWallTex = TextureGenerator.createGymSideWallTexture();
    const sideWallLen = 28.0;
    const sideWallGeo = new THREE.PlaneGeometry(sideWallLen, wallHeight);
    const sideWallMat = new THREE.MeshStandardMaterial({
      map: sideWallTex,
      roughness: 0.7,
      metalness: 0.04
    });

    // Left Wall
    const leftWall = new THREE.Mesh(sideWallGeo, sideWallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-13.0, wallHeight / 2, 2.0);
    leftWall.receiveShadow = true;
    wallGroup.add(leftWall);

    const leftBaseboardGeo = new THREE.BoxGeometry(sideWallLen, 0.28, 0.08);
    const leftBaseboard = new THREE.Mesh(leftBaseboardGeo, baseboardMat);
    leftBaseboard.rotation.y = Math.PI / 2;
    leftBaseboard.position.set(-12.96, 0.14, 2.0);
    wallGroup.add(leftBaseboard);

    // Right Wall
    const rightWall = new THREE.Mesh(sideWallGeo, sideWallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(13.0, wallHeight / 2, 2.0);
    rightWall.receiveShadow = true;
    wallGroup.add(rightWall);

    const rightBaseboard = new THREE.Mesh(leftBaseboardGeo, baseboardMat);
    rightBaseboard.rotation.y = -Math.PI / 2;
    rightBaseboard.position.set(12.96, 0.14, 2.0);
    wallGroup.add(rightBaseboard);

    this.group.add(wallGroup);
  }



  /**
   * Warm daytime anime lighting: warm sun key light streaming from windows,
   * soft warm ambient fill, and gentle court focus.
   */
  private buildLighting(): void {
    // 1. Warm daytime anime ambient fill
    const ambientLight = new THREE.AmbientLight(0xffedd8, 1.25);
    this.group.add(ambientLight);

    // 2. High sun directional key light streaming from the window side (upper left)
    const sunLight = new THREE.DirectionalLight(0xfff6e3, 2.6);
    sunLight.position.set(-4.5, 6.8, 2.2);
    sunLight.target.position.set(0, 0.76, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 16;
    sunLight.shadow.bias = -0.0002;
    sunLight.shadow.radius = 2.5;

    this.group.add(sunLight);
    this.group.add(sunLight.target);

    // 3. Gentle overhead court focus light
    const courtSpot = new THREE.SpotLight(0xfffaec, 1.6, 16, Math.PI / 4, 0.45, 1.0);
    courtSpot.position.set(0, 5.8, 0.1);
    courtSpot.target.position.set(0, 0.74, 0);
    this.group.add(courtSpot);
    this.group.add(courtSpot.target);

    // 4. Soft sky-blue window fill light from upper-left
    const skyFill = new THREE.DirectionalLight(0xbfe0f7, 0.65);
    skyFill.position.set(-6.0, 4.5, -2.0);
    skyFill.target.position.set(0, 0.76, 0);
    this.group.add(skyFill);
    this.group.add(skyFill.target);

    // 5. Warm floor bounce light
    const floorBounce = new THREE.DirectionalLight(0xf5dcc2, 0.55);
    floorBounce.position.set(0, 0.2, 0);
    floorBounce.target.position.set(0, 1.5, 0);
    this.group.add(floorBounce);
    this.group.add(floorBounce.target);
  }
}

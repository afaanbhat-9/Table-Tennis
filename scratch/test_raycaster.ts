import * as THREE from 'three';

const camera = new THREE.PerspectiveCamera(44, 16/9, 0.1, 60);
camera.position.set(0, 1.48, 3.08);
camera.lookAt(0, 0.75, -0.28);
camera.updateMatrixWorld();

const raycaster = new THREE.Raycaster();
let nullCount = 0;
for (let y = -2; y <= 2; y += 0.05) {
  for (let x = -2; x <= 2; x += 0.05) {
    const forwardReach = (y + 0.20) * 1.35;
    const targetZ = Math.max(0.95, Math.min(2.05, 1.84 - forwardReach));
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -targetZ);
    const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) {
      nullCount++;
      console.log('Null hit at:', x, y);
    }
  }
}
console.log('Total nulls:', nullCount);

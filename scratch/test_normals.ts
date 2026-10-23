import * as THREE from 'three';

// Paddle in Three.js:
// P1:
// group.rotation.x = rx;
// group.rotation.y = ry;
// group.rotation.z = rz;
// bladeGeo.rotateX(Math.PI / 2);
// The striking surface faces -Z (toward opponent).
// Local face normal is (0, 0, -1).

function getThreeNormal(rx: number, ry: number, rz: number, isPlayer: boolean): THREE.Vector3 {
  const euler = new THREE.Euler(
    rx,
    isPlayer ? ry : Math.PI - ry,
    isPlayer ? rz : -rz,
    'XYZ'
  );
  const v = new THREE.Vector3(0, 0, -1);
  v.applyEuler(euler);
  return v;
}

// Formula from physics.ts:
function getPhysicsNormal(rot: { x: number; y: number; z: number }, isP1: boolean) {
  const baseZ = isP1 ? -1 : 1;
  const cx = Math.cos(rot.x);
  const sx = Math.sin(rot.x);
  const cy = Math.cos(rot.y);
  const sy = Math.sin(rot.y);

  const nx = baseZ * sy * cx;
  const ny = -baseZ * sx;
  const nz = baseZ * cy * cx;

  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

console.log('--- PLAYER 1 (rx = -0.14, ry = 0.1, rz = -0.2) ---');
const threeP1 = getThreeNormal(-0.14, 0.1, -0.2, true);
const physP1 = getPhysicsNormal({ x: -0.14, y: 0.1, z: -0.2 }, true);
console.log('Three.js: ', threeP1);
console.log('Physics:  ', physP1);

console.log('--- PLAYER 2 (rx = -0.14, ry = 0.1, rz = -0.2) ---');
const threeP2 = getThreeNormal(-0.14, 0.1, -0.2, false);
const physP2 = getPhysicsNormal({ x: -0.14, y: 0.1, z: -0.2 }, false);
console.log('Three.js: ', threeP2);
console.log('Physics:  ', physP2);

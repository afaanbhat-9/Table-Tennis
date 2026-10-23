import * as THREE from 'three';

const euler1 = new THREE.Euler(-0.14, 0.1, -0.2, 'XYZ');
const v1 = new THREE.Vector3(0, 0, -1).applyEuler(euler1);
console.log('P1:', v1);

const euler2 = new THREE.Euler(-0.14, Math.PI - 0.1, 0.2, 'XYZ');
const v2 = new THREE.Vector3(0, 0, -1).applyEuler(euler2);
console.log('P2:', v2);

import * as THREE from 'three';
import { TABLE_HEIGHT, PLAYER_PADDLE_Z, TABLE_MAX_X } from '../shared/constants.js';

// Setup camera matching SceneManager
const camera = new THREE.PerspectiveCamera(45, 1280 / 720, 0.1, 50);
camera.position.set(0, 1.48, 2.88);
camera.lookAt(0, 0.74, -0.45);
camera.updateMatrixWorld();

const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), -PLAYER_PADDLE_Z);
const raycaster = new THREE.Raycaster();

function getPaddlePosFromScreen(clientX: number, clientY: number, width: number = 1280, height: number = 720) {
  const ndcX = (clientX / width) * 2 - 1;
  const ndcY = -(clientY / height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersectionPoint = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(planeZ, intersectionPoint);
  return hit ? { x: intersectionPoint.x, y: intersectionPoint.y, z: intersectionPoint.z } : null;
}

// Where does ball project on screen when at (0.3, 0.9, 1.4)?
const testBall = new THREE.Vector3(0.3, 0.9, 1.4);
testBall.project(camera);
const screenX = ((testBall.x + 1) / 2) * 1280;
const screenY = ((-testBall.y + 1) / 2) * 720;

console.log('Ball 3D position: (0.3, 0.9, 1.4)');
console.log('Screen pixel position of ball:', screenX, screenY);

const paddlePos = getPaddlePosFromScreen(screenX, screenY);
console.log('Paddle position when mouse aims directly at ball pixel:', paddlePos);
console.log('Difference in X between ball and paddle:', 0.3 - (paddlePos ? paddlePos.x : 0));

import * as THREE from 'three';
import { TABLE_HEIGHT, PLAYER_PADDLE_Z, PADDLE_RADIUS } from '../shared/constants.js';

const camera = new THREE.PerspectiveCamera(45, 1280 / 720, 0.1, 50);
camera.position.set(0, 1.48, 2.88);
camera.lookAt(0, 0.74, -0.45);
camera.updateMatrixWorld();

const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), -PLAYER_PADDLE_Z);
const raycaster = new THREE.Raycaster();

function testAim(ballX: number, ballY: number, ballZ: number) {
  const testBall = new THREE.Vector3(ballX, ballY, ballZ);
  testBall.project(camera);
  const screenX = ((testBall.x + 1) / 2) * 1280;
  const screenY = ((-testBall.y + 1) / 2) * 720;

  const ndcX = (screenX / 1280) * 2 - 1;
  const ndcY = -(screenY / 720) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersectionPoint = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(planeZ, intersectionPoint);

  const dx = (paddlePos: THREE.Vector3) => Math.abs(ballX - paddlePos.x);
  const dy = (paddlePos: THREE.Vector3) => Math.abs(ballY - paddlePos.y);
  const dist2D = hit ? Math.hypot(dx(intersectionPoint), dy(intersectionPoint)) : 999;
  console.log(`Ball (${ballX}, ${ballY}, ${ballZ}) -> Screen (${screenX.toFixed(1)}, ${screenY.toFixed(1)}) -> Paddle (${intersectionPoint.x.toFixed(3)}, ${intersectionPoint.y.toFixed(3)}) -> 2D Error: ${(dist2D * 100).toFixed(1)} cm (Paddle Radius is ${PADDLE_RADIUS * 100} cm)`);
}

testAim(0.5, 0.85, 1.0);
testAim(0.5, 0.85, 1.2);
testAim(0.5, 0.85, 1.4);
testAim(0.5, 0.85, 1.55);
testAim(-0.4, 0.90, 1.1);
testAim(-0.4, 0.90, 1.3);

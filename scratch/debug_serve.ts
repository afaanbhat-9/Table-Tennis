import { PhysicsSimulation } from '../shared/physics.js';
import { SUB_STEPS } from '../shared/constants.js';

const sim = new PhysicsSimulation();
sim.prepareServe('player1');
sim.paddle1.pos.x = 0.0;
sim.updateServeBall('player1');
sim.tossServe('player1');
for (let i = 0; i < 22; i++) {
  const res = sim.step(1/60, SUB_STEPS);
  if (res.soundEvents.length > 0 || res.pointEnded) {
    console.log(`step i=${i} snds=${res.soundEvents.map(s => s.type).join(',')} res=${res.pointEnded}`);
  }
}
console.log('after 22 steps: ball.pos=', sim.ball.pos, 'ball.vel=', sim.ball.vel, 'state=', sim.ball.serveState);

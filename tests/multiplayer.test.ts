import assert from 'assert';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { RoomManager } from '../server/src/roomManager.js';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/types.js';

console.log('=== RUNNING MULTIPLAYER REAL-TIME NETWORKING TESTS ===\n');

async function runMultiplayerTests() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: { origin: '*' }
  });

  const roomManager = new RoomManager(io);

  io.on('connection', (socket) => {
    socket.on('party:create', (data, cb) => cb(roomManager.createParty(socket, data.playerName, data.flag)));
    socket.on('party:join', (data, cb) => cb(roomManager.joinParty(socket, data.code, data.playerName, data.flag)));
    socket.on('party:ready', (data) => roomManager.setReady(socket, data.isReady));
    socket.on('party:start', () => roomManager.startMatch(socket));
    socket.on('party:leave', () => roomManager.leaveParty(socket));
    socket.on('game:input', (input) => roomManager.handleInput(socket, input));
    socket.on('disconnect', () => roomManager.handleDisconnect(socket));
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const serverUrl = `http://localhost:${port}`;
  console.log(`Test server running on port ${port}`);

  // Test 1: Create Party & Validate 6-Char Code
  console.log('Test 1: Creating party and validating code format...');
  const clientHost = ClientIO(serverUrl);
  await new Promise<void>((resolve) => clientHost.on('connect', resolve));

  let partyCode = '';
  await new Promise<void>((resolve) => {
    clientHost.emit('party:create', { playerName: 'HostPlayer' }, (res) => {
      assert.strictEqual(res.success, true);
      assert.ok(res.code, 'Should return a code');
      assert.strictEqual(res.code?.length, 6, 'Code must be 6 characters');
      partyCode = res.code!;
      resolve();
    });
  });
  console.log(`  -> Party created with code: ${partyCode}`);

  // Test 2: Invalid Party Code Rejection
  console.log('\nTest 2: Testing rejection of invalid party code...');
  const clientGuest = ClientIO(serverUrl);
  await new Promise<void>((resolve) => clientGuest.on('connect', resolve));

  await new Promise<void>((resolve) => {
    clientGuest.emit('party:join', { code: 'BAD999', playerName: 'Guest' }, (res) => {
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('not found or expired'));
      resolve();
    });
  });
  console.log('  -> Invalid party code correctly rejected!');

  // Test 3: Guest Joins Valid Party
  console.log('\nTest 3: Joining party with valid code...');
  await new Promise<void>((resolve) => {
    clientGuest.emit('party:join', { code: partyCode, playerName: 'GuestPlayer' }, (res) => {
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.room?.code, partyCode);
      assert.strictEqual(res.room?.players.player1?.name, 'HostPlayer');
      assert.strictEqual(res.room?.players.player2?.name, 'GuestPlayer');
      resolve();
    });
  });
  console.log('  -> Guest successfully joined party lobby!');

  // Test 4: Maximum 2 Players Enforcement (Third player rejected)
  console.log('\nTest 4: Verifying strict 2-player limit (rejecting 3rd player)...');
  const clientThird = ClientIO(serverUrl);
  await new Promise<void>((resolve) => clientThird.on('connect', resolve));

  await new Promise<void>((resolve) => {
    clientThird.emit('party:join', { code: partyCode, playerName: 'Intruder' }, (res) => {
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('already full'));
      resolve();
    });
  });
  console.log('  -> 3rd player correctly rejected (Party full 2/2)!');

  // Test 5: Ready Status & Match Start
  console.log('\nTest 5: Testing player readiness and match start countdown...');
  let countdownStarted = false;
  const countdownPromise = new Promise<void>((resolve) => {
    clientGuest.on('game:countdown', (count) => {
      countdownStarted = true;
      resolve();
    });
  });

  // Guest readies up
  clientGuest.emit('party:ready', { isReady: true });
  // Host starts match
  setTimeout(() => {
    clientHost.emit('party:start');
  }, 100);

  await countdownPromise;
  assert.strictEqual(countdownStarted, true, 'Countdown must start after both ready');
  console.log('  -> Match countdown triggered and synchronized successfully!');

  // Clean up previous clients
  clientHost.disconnect();
  clientGuest.disconnect();
  clientThird.disconnect();

  // Test 6: Party Re-creation on same socket (No premature party:left emitted)
  console.log('\nTest 6: Party Re-creation on same socket (Bug prevention test)...');
  const clientHost2 = ClientIO(serverUrl);
  await new Promise<void>((resolve) => clientHost2.on('connect', resolve));

  let prematurePartyLeftReceived = false;
  clientHost2.on('party:left', () => {
    prematurePartyLeftReceived = true;
  });

  // Host creates room 1
  let code1 = '';
  await new Promise<void>((resolve) => {
    clientHost2.emit('party:create', { playerName: 'Host2' }, (res) => {
      assert.strictEqual(res.success, true);
      assert.ok(res.room, 'Must return initial room state');
      code1 = res.code!;
      resolve();
    });
  });

  // Host creates room 2 on same socket (e.g. repeated click or new room)
  let code2 = '';
  await new Promise<void>((resolve) => {
    clientHost2.emit('party:create', { playerName: 'Host2' }, (res) => {
      assert.strictEqual(res.success, true);
      assert.ok(res.room, 'Must return room state for new room');
      code2 = res.code!;
      resolve();
    });
  });

  assert.strictEqual(prematurePartyLeftReceived, false, 'Creating party should NEVER emit party:left to creator socket!');
  assert.notStrictEqual(code1, code2, 'New code must be generated');
  console.log('  -> Party re-creation passed with no spurious party:left!');

  // Test 7: State synchronization via party:updated
  console.log('\nTest 7: Testing party:updated broadcast to both host and guest...');
  const clientGuest2 = ClientIO(serverUrl);
  await new Promise<void>((resolve) => clientGuest2.on('connect', resolve));

  let hostUpdated = false;
  let guestUpdated = false;

  clientHost2.on('party:updated', (room) => {
    if (room.players.player2?.name === 'Guest2') {
      hostUpdated = true;
    }
  });

  clientGuest2.on('party:updated', (room) => {
    if (room.players.player2?.name === 'Guest2') {
      guestUpdated = true;
    }
  });

  await new Promise<void>((resolve) => {
    clientGuest2.emit('party:join', { code: code2, playerName: 'Guest2' }, (res) => {
      assert.strictEqual(res.success, true);
      resolve();
    });
  });

  // Give short window for socket broadcast
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.strictEqual(hostUpdated, true, 'Host must receive party:updated with guest info');
  assert.strictEqual(guestUpdated, true, 'Guest must receive party:updated with both players');
  console.log('  -> party:updated synchronization verified for both clients!');

  // Test 8: Leaving party properly emits player:disconnected and updates lobby
  console.log('\nTest 8: Verifying player:disconnected and lobby update when opponent leaves...');
  let hostNotifiedOfGuestLeave = false;
  let hostLobbyResetToWaiting = false;

  clientHost2.on('player:disconnected', (data) => {
    if (data.side === 'player2') {
      hostNotifiedOfGuestLeave = true;
    }
  });

  clientHost2.on('party:updated', (room) => {
    if (!room.players.player2) {
      hostLobbyResetToWaiting = true;
    }
  });

  clientGuest2.emit('party:leave');
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.strictEqual(hostNotifiedOfGuestLeave, true, 'Host must be notified when guest leaves party');
  assert.strictEqual(hostLobbyResetToWaiting, true, 'Host lobby must update to show slot 2 is empty/waiting');
  console.log('  -> Opponent leave notification and lobby slot reset verified successfully!');

  // Final cleanup
  clientHost2.disconnect();
  clientGuest2.disconnect();
  server.close();

  console.log('\n=== ALL MULTIPLAYER TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runMultiplayerTests().catch((err) => {
  console.error('Multiplayer test failed:', err);
  process.exit(1);
});

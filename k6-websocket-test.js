import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom Metrics for 10k WebSocket benchmark
const wsConnections = new Counter('ws_connections_successful');
const wsConnectionErrors = new Counter('ws_connections_failed');
const wsMessagesReceived = new Counter('ws_messages_received');
const wsMessagesSent = new Counter('ws_messages_sent');
const wsHandshakeTime = new Trend('ws_handshake_duration_ms');
const connectionSuccessRate = new Rate('ws_success_rate');

export const options = {
  scenarios: {
    websocket_10k_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 1000 },   // Warm-up to 1k
        { duration: '30s', target: 5000 },   // Ramp to 5k
        { duration: '40s', target: 10000 },  // Peak at 10,000 concurrent VUs
        { duration: '30s', target: 10000 },  // Hold at 10k users
        { duration: '20s', target: 0 },      // Ramp down
      ],
      gracefulStop: '15s',
    },
  },
  thresholds: {
    ws_success_rate: ['rate>0.90'],          // >90% success under 10k load
    ws_handshake_duration_ms: ['p(95)<2000'], // 95% of handshakes within 2s
  },
};

export default function () {
  const targetUrl = __ENV.TARGET_URL || 'ws://backend-test:4000/socket.io/?EIO=4&transport=websocket';
  const startTime = Date.now();

  const res = ws.connect(targetUrl, {}, function (socket) {
    let isHandshakeComplete = false;

    socket.on('open', function () {
      // Waiting for Engine.io open handshake packet '0{...}'
    });

    socket.on('message', function (data) {
      wsMessagesReceived.add(1);

      // 1. Engine.io Open Packet: '0{"sid": ...}'
      if (data.startsWith('0')) {
        // Send Socket.io CONNECT packet
        socket.send('40');
        wsMessagesSent.add(1);
      } 
      // 2. Socket.io Handshake ACK: '40{"sid": ...}'
      else if (data.startsWith('40')) {
        isHandshakeComplete = true;
        wsHandshakeTime.add(Date.now() - startTime);
        wsConnections.add(1);
        connectionSuccessRate.add(1);

        // Join room specific to this VU
        socket.send(`42["join-job-room","job_vu_${__VU}"]`);
        wsMessagesSent.add(1);
      } 
      // 3. Engine.io Ping: '2' -> Reply Pong: '3'
      else if (data === '2') {
        socket.send('3');
        wsMessagesSent.add(1);
      }
    });

    socket.on('close', function () {
      if (!isHandshakeComplete) {
        wsConnectionErrors.add(1);
        connectionSuccessRate.add(0);
      }
    });

    socket.on('error', function (err) {
      wsConnectionErrors.add(1);
      connectionSuccessRate.add(0);
    });

    // Hold connection open with periodic heartbeat check
    socket.setInterval(function () {
      if (isHandshakeComplete) {
        socket.send(`42["join-admin-room"]`);
        wsMessagesSent.add(1);
      }
    }, 10000);

    // Keep session active for the VU iteration
    socket.setTimeout(function () {
      socket.close();
    }, 25000);
  });

  check(res, {
    'WebSocket 101 Handshake upgraded': (r) => r && r.status === 101,
  });
}

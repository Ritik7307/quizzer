const jwt = require('jsonwebtoken');
const http = require('http');

const secret = process.env.JWT_SECRET || 'quizzer-dev-secret-change-in-production-32chars';
const token = jwt.sign({ userId: 'cm11w0z2x0000a6m4q1r2y3z4', email: 'test@example.com', role: 'USER' }, secret, { expiresIn: '7d' }); // Need a valid DB user id for some things

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/daily/today',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data.substring(0, 500));
  });
});

req.on('error', (err) => {
  console.log('Error:', err.message);
});

req.end();

const jwt = require('jsonwebtoken');
const http = require('http');

const secret = process.env.JWT_SECRET || 'quizzer-dev-secret-change-in-production-32chars';
const token = jwt.sign({ userId: 'some-user-id', email: 'test@example.com', role: 'USER' }, secret, { expiresIn: '7d' });

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/notifications',
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
    console.log('Body:', data);
  });
});

req.on('error', (err) => {
  console.log('Error:', err.message);
});

req.end();

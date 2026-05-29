const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/daily/today',
  method: 'GET'
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

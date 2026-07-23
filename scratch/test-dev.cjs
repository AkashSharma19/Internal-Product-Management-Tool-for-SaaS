const http = require('http');

const url = 'http://localhost:3000/api/data?action=paginated-meetings-data&type=adminFeedback&page=1&limit=20';

const options = {
  headers: {
    'x-user-id': 'spk-1781258200666'
  }
};

http.get(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Localhost Status: ${res.statusCode}`);
    console.log("Response JSON:", data.slice(0, 500));
  });
}).on('error', (err) => {
  console.error("Localhost Request Error:", err);
});

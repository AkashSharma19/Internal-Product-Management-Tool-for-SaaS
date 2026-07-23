const https = require('https');

const url = 'https://productmanagement-3x54ivwy7-akash-sharmas-projects-2da0eb49.vercel.app/api/data?action=paginated-meetings-data&type=adminFeedback&page=1&limit=20';

const options = {
  headers: {
    'x-user-id': 'spk-1781258200666'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(data);
      console.log("Success:", parsed.success);
      if (parsed.success) {
        console.log("Data count:", parsed.data.length);
        console.log("Total items:", parsed.totalItems);
        console.log("Completed items:", parsed.completedItems);
        if (parsed.data.length > 0) {
          console.log("First item:", JSON.stringify(parsed.data[0], null, 2));
        }
      } else {
        console.log("Error:", parsed.error);
      }
    } catch (e) {
      console.log("Raw Response:", data);
    }
  });
}).on('error', (err) => {
  console.error("HTTP Request Error:", err);
});

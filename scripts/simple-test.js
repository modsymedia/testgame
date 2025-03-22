/**
 * Simple test script for leaderboard API
 */

const http = require('http');

// Configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 3001;

console.log(`Starting tests - targeting http://${SERVER_HOST}:${SERVER_PORT}`);

// Helper function to make GET requests
function httpGet(path) {
  console.log(`Making GET request to ${path}`);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    console.log('Request options:', options);

    const req = http.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log('Response headers:', res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        console.log(`Received chunk: ${chunk.length} bytes`);
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Total response size: ${data.length} bytes`);
        try {
          const jsonData = JSON.parse(data);
          console.log('Successfully parsed JSON');
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonData
          });
        } catch (e) {
          console.error('Error parsing JSON:', e);
          console.log('Raw response:', data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Request error: ${error.message}`);
      reject(error);
    });
    
    console.log('Sending request...');
    req.end();
  });
}

// Helper function to make POST requests
function httpPost(path, data) {
  console.log(`Making POST request to ${path}`, data);
  
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(data);
    
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };
    
    console.log('Request options:', options);

    const req = http.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log('Response headers:', res.headers);
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        console.log(`Received chunk: ${chunk.length} bytes`);
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`Total response size: ${responseData.length} bytes`);
        try {
          const jsonData = JSON.parse(responseData);
          console.log('Successfully parsed JSON');
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonData
          });
        } catch (e) {
          console.error('Error parsing JSON:', e);
          console.log('Raw response:', responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Request error: ${error.message}`);
      reject(error);
    });
    
    console.log('Sending data:', dataString);
    req.write(dataString);
    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('🧪 Starting simple API tests...');
  
  try {
    // Test the leaderboard API
    console.log('\n📋 Testing leaderboard API...');
    const leaderboardResponse = await httpGet('/api/leaderboard');
    
    console.log(`Status: ${leaderboardResponse.statusCode}`);
    console.log('Response:', JSON.stringify(leaderboardResponse.body, null, 2));
    
    // Test updating a score
    console.log('\n📋 Testing score update...');
    const testWallet = 'TEST' + Math.random().toString(36).substring(2, 8);
    const testScore = Math.floor(Math.random() * 1000) + 1;
    
    const updateResponse = await httpPost('/api/leaderboard', {
      walletAddress: testWallet,
      score: testScore
    });
    
    console.log(`Status: ${updateResponse.statusCode}`);
    console.log('Response:', JSON.stringify(updateResponse.body, null, 2));
    
    console.log('\n✅ Tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error in tests:', error);
}); 
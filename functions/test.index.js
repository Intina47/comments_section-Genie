const axios = require('axios');

async function testDialogflowGateway() {
  try {
    const response = await axios.post('http://127.0.0.1:5001/commentssectiongenie/us-central1/dialogflowGateway', {
      sessionId: 'test-session',
      query: 'Hello',
      languageCode: 'en'
    });
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testDialogflowGateway();

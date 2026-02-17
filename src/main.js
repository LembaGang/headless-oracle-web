// 1. HARDCODE YOUR KEY HERE (Exact case, no spaces)
const MASTER_API_KEY = 'oracle_primary_key_2026';

const testBtn = document.querySelector('#test-api');
const apiResult = document.querySelector('#api-result');

testBtn.addEventListener('click', async () => {
  testBtn.innerText = "Connecting...";
  apiResult.innerText = "Authorized handshake initiated...";
  
  try {
    // 2. THE URL FIX: Must include /v5/status
    const response = await fetch('https://headless-oracle-v5.mmsebenzi-oracle.workers.dev/v5/status?mic=XNYS', {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'X-Oracle-Key': MASTER_API_KEY  // 3. THE KEY INJECTION
      }
    });

    const data = await response.json();

    // 4. ERROR HANDLING
    if (response.status === 404) {
      throw new Error("Endpoint mismatch (404). Check URL path.");
    }
    if (response.status === 401) {
      throw new Error(`Auth Failed: ${data.message}`);
    }

    // 5. SUCCESS
    apiResult.innerText = JSON.stringify(data, null, 2);
    apiResult.style.color = "#00ff00";
    testBtn.innerText = "Success";

  } catch (err) {
    console.error(err);
    apiResult.innerText = `// ERROR: ${err.message}`;
    apiResult.style.color = "#ff4444";
    testBtn.innerText = "Failed";
  }
});
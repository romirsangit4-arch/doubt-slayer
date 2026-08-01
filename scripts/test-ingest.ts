import fs from 'fs';
import path from 'path';

async function testIngestion() {
  console.log('Testing ingestion phase with localhost API...');
  
  // Create a dummy transparent 1x1 image for testing
  const dummyImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  try {
    const response = await fetch('http://localhost:3000/api/engine/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: dummyImage,
      }),
    });

    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      return;
    }

    const data = await response.json();
    console.log('Response Phase:', data.phase);
    console.log('--- Solution Context (Pro) ---');
    console.log(JSON.stringify(data.solutionContext, null, 2));
    console.log('\n--- Diagnostic Battery (Flash) ---');
    console.log(JSON.stringify(data.diagnosticBattery, null, 2));

  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testIngestion();

const fs = require('fs');

async function checkModels() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const key1 = env.match(/GEMINI_API_KEY_1="(.*?)"/)[1];
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key1}`);
  const data = await res.json();
  if (data.models) {
    console.log(data.models.map(m => m.name));
  } else {
    console.log(data);
  }
}
checkModels();

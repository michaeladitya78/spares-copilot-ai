import { Ollama } from 'ollama';

const ollama = new Ollama({ 
  host: process.env.OLLAMA_HOST || 'http://localhost:11434' 
});

const models = [
  'llama3.2:3b',
  'llama3.2:1b',
  'gemma2:2b'
];

async function pullModels() {
  console.log('🤖 Starting model download...');
  
  for (const model of models) {
    try {
      console.log(`📥 Pulling ${model}...`);
      
      const stream = await ollama.pull({ 
        model, 
        stream: true 
      });
      
      for await (const chunk of stream) {
        if (chunk.status) {
          process.stdout.write(`\r${model}: ${chunk.status}`);
          if (chunk.completed && chunk.total) {
            const percent = Math.round((chunk.completed / chunk.total) * 100);
            process.stdout.write(` ${percent}%`);
          }
        }
      }
      
      console.log(`\n✅ ${model} downloaded successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to pull ${model}:`, error.message);
    }
  }
  
  console.log('🎉 Model download completed!');
}

pullModels().catch(console.error);

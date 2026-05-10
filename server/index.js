import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const port = Number(process.env.PORT || 3001);
const host = '127.0.0.1';
const app = createApp();

app.listen(port, host, () => {
  console.log(`DeepSeek chat API listening at http://${host}:${port}`);
});

import 'dotenv/config';

import { createApp } from './app.js';

const app = createApp();

const PORT = process.env.PORT ?? 3333;

app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});

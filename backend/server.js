import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './src/app.js';
import connectDatabase from './src/config/database.js';
import seedDatabase from './src/config/seedDatabase.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(currentDirectory, '..', 'atlas-credentials.env') });
dotenv.config({ path: path.resolve(currentDirectory, '.env') });

const port = Number(process.env.PORT) || 5000;

try {
  await connectDatabase();
  await seedDatabase();
  app.listen(port, () => {
    console.log(`Ceejay API listening on port ${port}`);
  });
} catch (error) {
  console.error('Unable to start the API:', error.message);
  process.exitCode = 1;
}

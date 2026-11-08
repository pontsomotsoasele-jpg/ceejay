import mongoose from 'mongoose';

export default async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing from atlas-credentials.env or backend/.env.');
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');
}

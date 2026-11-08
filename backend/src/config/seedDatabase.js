import bcrypt from 'bcryptjs';
import Category from '../models/Category.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

const initialCategories = ['Music', 'Videos', 'Behind the scenes'];
const initialPosts = [
  ['fb1', 'Facebook video', 'Videos', 'Facebook', 'https://www.facebook.com/share/v/1GyeG91bfC/'],
  ['fb2', 'Facebook video', 'Videos', 'Facebook', 'https://www.facebook.com/share/v/1A8gJ3zFqx/'],
  ['fb3', 'Facebook video', 'Videos', 'Facebook', 'https://www.facebook.com/share/v/1FADwuWRm3/'],
  ['fb4', 'Facebook video', 'Videos', 'Facebook', 'https://www.facebook.com/share/v/1NZpVBT7wz/'],
  ['fb5', 'Facebook video', 'Videos', 'Facebook', 'https://www.facebook.com/share/v/1A5CiaR4yN/'],
  ['yt1', 'YouTube video', 'Music', 'YouTube', 'https://youtu.be/red7tHvcAKE'],
  ['yt2', 'YouTube video', 'Music', 'YouTube', 'https://youtu.be/T5yaBvp4SQg'],
  ['yt3', 'YouTube video', 'Music', 'YouTube', 'https://youtu.be/2V8_l0r_S5Y'],
  ['yt4', 'YouTube video', 'Music', 'YouTube', 'https://youtu.be/M96-DS2cu5w'],
  ['yt5', 'YouTube video', 'Music', 'YouTube', 'https://youtu.be/iBlyBgqjbFc'],
  ['yt6', 'YouTube video', 'Music', 'YouTube', 'https://youtu.be/sGE4BmsBx4c'],
  ['yt7', 'YouTube video', 'Music', 'YouTube', 'https://youtu.be/7D8XiHbG3XU'],
];

export default async function seedDatabase() {
  const creatorEmail = (process.env.CREATOR_EMAIL || 'zinnia@gmail.com').toLowerCase();
  const creatorPassword = process.env.CREATOR_PASSWORD || 'admin123';
  const existingCreator = await User.findOne({ email: creatorEmail });

  if (!existingCreator) {
    const passwordHash = await bcrypt.hash(creatorPassword, 12);
    await User.create({
      name: 'Ceejay Da Mafia',
      email: creatorEmail,
      passwordHash,
      role: 'creator',
    });
  }

  await Promise.all(
    initialCategories.map((name) =>
      Category.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true }),
    ),
  );

  const creator = await User.findOne({ email: creatorEmail }).select('_id');
  await Promise.all(
    initialPosts.map(([seedKey, title, category, source, url]) =>
      Post.updateOne(
        { seedKey },
        {
          $setOnInsert: {
            seedKey,
            title: `${title} ${seedKey.slice(-1)}`,
            description: '',
            category,
            source,
            url,
            createdBy: creator._id,
            status: 'published',
          },
        },
        { upsert: true },
      ),
    ),
  );
}

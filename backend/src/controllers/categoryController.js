import Category from '../models/Category.js';

export async function listCategories(_request, response, next) {
  try {
    const categories = await Category.find().sort({ name: 1 }).select('name').lean();
    response.json(categories.map((category) => category.name));
  } catch (error) {
    next(error);
  }
}

export async function createCategory(request, response, next) {
  try {
    const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
    if (name.length < 2 || name.length > 40) {
      return response.status(400).json({ message: 'Category names must be between 2 and 40 characters.' });
    }
    const category = await Category.create({ name });
    response.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'That category already exists.' });
    }
    next(error);
  }
}

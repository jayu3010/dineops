const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');
const prisma = new PrismaClient();

// Add Category
exports.createCategory = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja_mongodb');

    const { name, restaurantId } = req.body;
    const categoryData = {
      name,
      restaurantId: require('mongodb').ObjectId.createFromHexString(restaurantId),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('MenuCategory').insertOne(categoryData);
    const category = { ...categoryData, id: result.insertedId.toString(), _id: result.insertedId };

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

// Get all Categories for a Restaurant
exports.getMenu = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja_mongodb');

    const { restaurantId } = req.params;
    const categories = await db.collection('MenuCategory').aggregate([
      {
        $match: { restaurantId: require('mongodb').ObjectId.createFromHexString(restaurantId) }
      },
      {
        $lookup: {
          from: 'MenuItem',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'items'
        }
      },
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          restaurantId: { $toString: '$restaurantId' },
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                id: { $toString: '$$item._id' },
                name: '$$item.name',
                description: '$$item.description',
                price: '$$item.price',
                image: '$$item.image',
                isAvailable: '$$item.isAvailable'
              }
            }
          }
        }
      }
    ]).toArray();

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

// Update Category
exports.updateCategory = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja_mongodb');

    const { id } = req.params;
    const { name } = req.body;

    const result = await db.collection('MenuCategory').updateOne(
      { _id: require('mongodb').ObjectId.createFromHexString(id) },
      { $set: { name, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, message: 'Category updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja_mongodb');

    const { id } = req.params;

    const result = await db.collection('MenuCategory').deleteOne({
      _id: require('mongodb').ObjectId.createFromHexString(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

// Add Menu Item
exports.createMenuItem = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja_mongodb');

    const { categoryId, name, description, price, image } = req.body;
    const itemData = {
      categoryId: require('mongodb').ObjectId.createFromHexString(categoryId),
      name,
      description,
      price: parseFloat(price),
      image,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('MenuItem').insertOne(itemData);
    const item = { ...itemData, id: result.insertedId.toString(), _id: result.insertedId };

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

// Update Menu Item
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, isAvailable, image } = req.body;
    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        isAvailable,
        image
      }
    });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Menu Item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.menuItem.delete({ where: { id } });
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

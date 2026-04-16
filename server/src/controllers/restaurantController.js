const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');
const prisma = new PrismaClient();

const tableController = require('./tableController');

function timeToMinutes(t) {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (Number.isNaN(h)) return 0;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

/** openTime / closeTime as "HH:mm" (24h). Supports overnight (e.g. 22:00–02:00). */
function computeOpenNow(openTime, closeTime) {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const o = timeToMinutes(openTime);
  const c = timeToMinutes(closeTime);
  if (c > o) return cur >= o && cur < c;
  if (c === o) return false;
  return cur >= o || cur < c;
}

function mapPublicRestaurantRow(r, ratingInfo) {
  const rt = ratingInfo || { avg: 0, count: 0 };
  const avg = rt.count ? Math.round((rt.avg + Number.EPSILON) * 10) / 10 : null;
  return {
    id: r.id,
    tenantId: r.tenantId,
    name: r.name,
    logo: r.logo,
    address: r.address,
    city: r.city,
    cuisine: r.cuisine,
    description: r.description,
    openTime: r.openTime,
    closeTime: r.closeTime,
    priceForTwo: r.priceForTwo,
    vegFriendly: r.vegFriendly,
    outdoorSeating: r.outdoorSeating,
    parkingAvailable: r.parkingAvailable,
    acceptsCards: r.acceptsCards,
    averageRating: avg,
    reviewCount: rt.count,
    openNow: computeOpenNow(r.openTime, r.closeTime)
  };
}

/** PATCH /restaurants/my — owner updates legal / profile fields (Prisma) */
exports.patchMyRestaurant = async (req, res) => {
  try {
    const rest = await prisma.restaurant.findFirst({ where: { ownerId: req.user.id } });
    if (!rest) {
      return res.status(404).json({ success: false, message: 'No restaurant found for this account' });
    }

    const {
      name,
      address,
      city,
      cuisine,
      description,
      openTime,
      closeTime,
      phone,
      gstin,
      fssai,
      priceForTwo,
      vegFriendly,
      outdoorSeating,
      parkingAvailable,
      acceptsCards
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (cuisine !== undefined) data.cuisine = cuisine;
    if (description !== undefined) data.description = description;
    if (openTime !== undefined) data.openTime = openTime;
    if (closeTime !== undefined) data.closeTime = closeTime;
    if (phone !== undefined) data.phone = phone;
    if (gstin !== undefined) data.gstin = gstin === '' ? null : gstin;
    if (fssai !== undefined) data.fssai = fssai === '' ? null : fssai;
    if (priceForTwo !== undefined) data.priceForTwo = priceForTwo === '' || priceForTwo == null ? null : Number(priceForTwo);
    if (vegFriendly !== undefined) data.vegFriendly = Boolean(vegFriendly);
    if (outdoorSeating !== undefined) data.outdoorSeating = Boolean(outdoorSeating);
    if (parkingAvailable !== undefined) data.parkingAvailable = Boolean(parkingAvailable);
    if (acceptsCards !== undefined) data.acceptsCards = Boolean(acceptsCards);

    const updated = await prisma.restaurant.update({
      where: { id: rest.id },
      data
    });

    res.json({ success: true, message: 'Restaurant updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** GET /restaurants/public — active restaurants for discovery (no auth) */
exports.listPublicRestaurants = async (req, res) => {
  try {
    const {
      q,
      city,
      cuisine,
      sort,
      ratingMin,
      openNow,
      priceMin,
      priceMax,
      vegOnly,
      outdoor,
      parking,
      cards
    } = req.query;

    const where = { status: 'ACTIVE' };

    const cityStr = city != null ? String(city).trim() : '';
    if (cityStr && cityStr.toLowerCase() !== 'all') {
      where.city = cityStr;
    }

    const cuisineStr = cuisine != null ? String(cuisine).trim() : '';
    if (cuisineStr && cuisineStr.toLowerCase() !== 'all') {
      where.cuisine = cuisineStr;
    }

    if (vegOnly === 'true' || vegOnly === '1') where.vegFriendly = true;
    if (outdoor === 'true' || outdoor === '1') where.outdoorSeating = true;
    if (parking === 'true' || parking === '1') where.parkingAvailable = true;
    if (cards === 'true' || cards === '1') where.acceptsCards = true;

    const [restaurants, ratingAgg, cityGroups, cuisineGroups] = await Promise.all([
      prisma.restaurant.findMany({ where, orderBy: { name: 'asc' } }),
      prisma.review.groupBy({
        by: ['restaurantId'],
        _avg: { rating: true },
        _count: { _all: true }
      }),
      prisma.restaurant.groupBy({
        by: ['city'],
        where: { status: 'ACTIVE' }
      }),
      prisma.restaurant.groupBy({
        by: ['cuisine'],
        where: { status: 'ACTIVE' }
      })
    ]);

    const ratingById = new Map(
      ratingAgg.map((x) => [x.restaurantId, { avg: x._avg.rating || 0, count: x._count._all }])
    );

    let rows = restaurants.map((r) => mapPublicRestaurantRow(r, ratingById.get(r.id)));

    const qLower = q != null ? String(q).toLowerCase().trim() : '';
    if (qLower) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(qLower) ||
          r.cuisine.toLowerCase().includes(qLower) ||
          r.city.toLowerCase().includes(qLower) ||
          (r.description && r.description.toLowerCase().includes(qLower))
      );
    }

    const rMin = parseFloat(String(ratingMin || ''));
    if (!Number.isNaN(rMin) && rMin > 0) {
      rows = rows.filter((r) => r.averageRating != null && r.averageRating >= rMin);
    }

    if (openNow === 'true' || openNow === '1') {
      rows = rows.filter((r) => r.openNow);
    }

    const pMin = parseFloat(String(priceMin || ''));
    const pMax = parseFloat(String(priceMax || ''));
    if (!Number.isNaN(pMin) || !Number.isNaN(pMax)) {
      rows = rows.filter((r) => {
        if (r.priceForTwo == null) return false;
        if (!Number.isNaN(pMin) && r.priceForTwo < pMin) return false;
        if (!Number.isNaN(pMax) && r.priceForTwo > pMax) return false;
        return true;
      });
    }

    const sortKey = sort != null ? String(sort).toLowerCase() : 'relevance';
    if (sortKey === 'rating') {
      rows.sort((a, b) => {
        const ar = a.averageRating ?? -1;
        const br = b.averageRating ?? -1;
        if (br !== ar) return br - ar;
        return a.name.localeCompare(b.name);
      });
    } else if (sortKey === 'price_asc') {
      rows.sort((a, b) => {
        const ap = a.priceForTwo ?? Number.POSITIVE_INFINITY;
        const bp = b.priceForTwo ?? Number.POSITIVE_INFINITY;
        if (ap !== bp) return ap - bp;
        return a.name.localeCompare(b.name);
      });
    } else if (sortKey === 'price_desc') {
      rows.sort((a, b) => {
        const ap = a.priceForTwo ?? -1;
        const bp = b.priceForTwo ?? -1;
        if (bp !== ap) return bp - ap;
        return a.name.localeCompare(b.name);
      });
    } else if (sortKey === 'relevance' && qLower) {
      const score = (r) => {
        let s = 0;
        if (r.name.toLowerCase().includes(qLower)) s += 4;
        if (r.cuisine.toLowerCase().includes(qLower)) s += 2;
        if (r.city.toLowerCase().includes(qLower)) s += 1;
        if (r.description && r.description.toLowerCase().includes(qLower)) s += 1;
        return s;
      };
      rows.sort((a, b) => {
        const d = score(b) - score(a);
        if (d !== 0) return d;
        return a.name.localeCompare(b.name);
      });
    } else {
      rows.sort((a, b) => a.name.localeCompare(b.name));
    }

    const meta = {
      cities: cityGroups.map((g) => g.city).sort((a, b) => a.localeCompare(b)),
      cuisines: cuisineGroups.map((g) => g.cuisine).sort((a, b) => a.localeCompare(b))
    };

    res.json({ success: true, data: rows, meta });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** GET /restaurants/public/:tenantId — single active restaurant (no auth) */
exports.getPublicRestaurantByTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const r = await prisma.restaurant.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { user: { select: { id: true, name: true } } }
        }
      }
    });
    if (!r) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const ratingAgg = await prisma.review.aggregate({
      where: { restaurantId: r.id },
      _avg: { rating: true },
      _count: { _all: true }
    });

    const avg =
      ratingAgg._count._all > 0
        ? Math.round((ratingAgg._avg.rating + Number.EPSILON) * 10) / 10
        : null;

    const { reviews, ...rest } = r;
    res.json({
      success: true,
      data: {
        ...rest,
        averageRating: avg,
        reviewCount: ratingAgg._count._all,
        openNow: computeOpenNow(r.openTime, r.closeTime),
        reviews
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllRestaurants = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');

    const restaurants = await db.collection('Restaurant').aggregate([
      {
        $lookup: {
          from: 'User',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'owner'
        }
      },
      {
        $lookup: {
          from: 'Plan',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      {
        $unwind: { path: '$owner', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$plan', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          address: 1,
          city: 1,
          cuisine: 1,
          description: 1,
          openTime: 1,
          closeTime: 1,
          phone: 1,
          tenantId: 1,
          status: 1,
          createdAt: 1,
          owner: { name: '$owner.name', email: '$owner.email' },
          plan: 1
        }
      }
    ]).toArray();

    res.json({ success: true, data: restaurants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

exports.updateRestaurantStatus = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    const { id } = req.params;
    const { status } = req.body; // ACTIVE, SUSPENDED, PENDING

    await client.connect();
    const db = client.db('petpooja-copy');

    const result = await db.collection('Restaurant').updateOne(
      { _id: require('mongodb').ObjectId.createFromHexString(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // If active, initialize 20 tables if not already present
    if (status === 'ACTIVE') {
      await tableController.initializeTables(id);
    }

    // If active, we might want to send an email notification
    res.json({ success: true, message: `Restaurant status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

exports.registerRestaurant = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');

    const { name, address, city, cuisine, description, openTime, closeTime, phone, planId, ownerId: reqOwnerId } = req.body;

    // If SuperAdmin is creating, they can specify an ownerId. Otherwise, use token user ID.
    const isSuperAdmin = req.user.role === 'SUPERADMIN';
    const ownerId = (isSuperAdmin && reqOwnerId) ? reqOwnerId : req.user.id;

    // Check if user already owns a restaurant
    const existingRestaurant = await db.collection('Restaurant').findOne({
      ownerId: require('mongodb').ObjectId.createFromHexString(ownerId)
    });
    if (existingRestaurant) {
      return res.status(400).json({ success: false, message: 'This user already has a restaurant registered.' });
    }

    const tenantId = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

    // SuperAdmins can automatically approve the restaurant and we can initialize tables
    const status = isSuperAdmin ? 'ACTIVE' : 'PENDING';

    const restaurantData = {
      name,
      address,
      city,
      cuisine,
      description,
      openTime,
      closeTime,
      phone,
      tenantId,
      planId: require('mongodb').ObjectId.createFromHexString(planId),
      ownerId: require('mongodb').ObjectId.createFromHexString(ownerId),
      status,
      priceForTwo: req.body.priceForTwo != null ? Number(req.body.priceForTwo) : null,
      vegFriendly: Boolean(req.body.vegFriendly),
      outdoorSeating: Boolean(req.body.outdoorSeating),
      parkingAvailable: Boolean(req.body.parkingAvailable),
      acceptsCards: req.body.acceptsCards !== undefined ? Boolean(req.body.acceptsCards) : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('Restaurant').insertOne(restaurantData);
    const restaurant = { ...restaurantData, id: result.insertedId.toString(), _id: result.insertedId };

    // Update user's role to ADMIN
    await db.collection('User').updateOne(
      { _id: require('mongodb').ObjectId.createFromHexString(ownerId) },
      { $set: { role: 'ADMIN', updatedAt: new Date() } }
    );

    if (status === 'ACTIVE') {
      await tableController.initializeTables(restaurant.id);
    }

    res.status(201).json({ success: true, message: 'Restaurant created successfully!', data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

exports.deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.restaurant.delete({ where: { id } });
    res.json({ success: true, message: 'Restaurant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      city,
      cuisine,
      description,
      openTime,
      closeTime,
      phone,
      planId,
      ownerId,
      gstin,
      fssai,
      priceForTwo,
      vegFriendly,
      outdoorSeating,
      parkingAvailable,
      acceptsCards
    } = req.body;
    
    // Make sure owner isn't assigned to another restaurant, unless it's the current one
    if (ownerId) {
       const existingOwnerRes = await prisma.restaurant.findUnique({ where: { ownerId } });
       if (existingOwnerRes && existingOwnerRes.id !== id) {
          return res.status(400).json({ success: false, message: 'User is already assigned to another restaurant' });
       }
    }

    const data = { name, address, city, cuisine, description, openTime, closeTime, phone, planId, ownerId };
    if (gstin !== undefined) data.gstin = gstin === '' ? null : gstin;
    if (fssai !== undefined) data.fssai = fssai === '' ? null : fssai;
    if (priceForTwo !== undefined) data.priceForTwo = priceForTwo === '' || priceForTwo == null ? null : Number(priceForTwo);
    if (vegFriendly !== undefined) data.vegFriendly = Boolean(vegFriendly);
    if (outdoorSeating !== undefined) data.outdoorSeating = Boolean(outdoorSeating);
    if (parkingAvailable !== undefined) data.parkingAvailable = Boolean(parkingAvailable);
    if (acceptsCards !== undefined) data.acceptsCards = Boolean(acceptsCards);

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data
    });
    
    // Update owner's role to ADMIN if changed
    if (ownerId) {
      await prisma.user.update({ where: { id: ownerId }, data: { role: 'ADMIN' } });
    }

    res.json({ success: true, message: 'Restaurant updated successfully', data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

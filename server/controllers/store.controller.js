import mongoose from 'mongoose';
import Store from '../models/store.model.js';

const validStatuses = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

const validateStore = (data) => {
  const errors = [];

  if (!data.name?.trim()) errors.push('Store name is required.');
  if (!data.address?.trim()) errors.push('Address is required.');
  if (!data.city?.trim()) errors.push('City is required.');
  if (!data.state?.trim()) errors.push('State is required.');

  const lat = Number(data.latitude);
  const lng = Number(data.longitude);

  if (
    data.latitude === '' ||
    data.latitude === undefined ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90
  ) {
    errors.push('Valid latitude is required.');
  }

  if (
    data.longitude === '' ||
    data.longitude === undefined ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    errors.push('Valid longitude is required.');
  }

  return errors;
};

const normalizeStoreData = (data) => ({
  name: data.name.trim(),
  address: data.address.trim(),
  city: data.city.trim(),
  state: data.state.trim(),
  pincode: data.pincode?.trim() || '',
  phone: data.phone?.trim() || '',
  email: data.email?.trim().toLowerCase() || '',
  openingTime: data.openingTime?.trim() || '10:00 AM',
  closingTime: data.closingTime?.trim() || '09:00 PM',
  openingDays: Array.isArray(data.openingDays) ? data.openingDays : undefined,
  latitude: Number(data.latitude),
  longitude: Number(data.longitude),
});

// Public: GET /api/store/all
export const getAllStores = async (req, res) => {
  try {
    const { city, search } = req.query;

    const query = { status: 'ACTIVE' };

    if (city?.trim()) {
      query.city = {
        $regex: city.trim(),
        $options: 'i',
      };
    }

    if (search?.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { address: { $regex: term, $options: 'i' } },
        { city: { $regex: term, $options: 'i' } },
        { pincode: { $regex: term, $options: 'i' } },
      ];
    }

    const stores = await Store.find(query).sort({
      city: 1,
      name: 1,
    });

    return res.status(200).json({
      success: true,
      error: false,
      total: stores.length,
      data: stores,
    });
  } catch (error) {
    console.error('GET ALL STORES ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: 'Failed to fetch stores.',
    });
  }
};

// Public: GET /api/store/:id
export const getStoreById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Invalid store ID.',
      });
    }

    const store = await Store.findOne({
      _id: req.params.id,
      status: 'ACTIVE',
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Store not found.',
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      data: store,
    });
  } catch (error) {
    console.error('GET STORE ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: 'Failed to fetch store.',
    });
  }
};

// Admin: GET /api/store/admin/all
export const getAllStoresAdmin = async (req, res) => {
  try {
    const { status, city } = req.query;
    const query = {};

    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: 'Invalid store status.',
        });
      }
      query.status = status;
    }

    if (city?.trim()) {
      query.city = { $regex: city.trim(), $options: 'i' };
    }

    const stores = await Store.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      error: false,
      total: stores.length,
      data: stores,
    });
  } catch (error) {
    console.error('ADMIN GET STORES ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: 'Failed to fetch admin stores.',
    });
  }
};

// Admin: POST /api/store/create
export const createStore = async (req, res) => {
  try {
    const errors = validateStore(req.body);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        error: true,
        message: errors.join(' '),
      });
    }

    const store = await Store.create(normalizeStoreData(req.body));

    return res.status(201).json({
      success: true,
      error: false,
      message: 'Store created successfully.',
      data: store,
    });
  } catch (error) {
    console.error('CREATE STORE ERROR:', error);

    return res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      error: true,
      message:
        error.code === 11000
          ? 'A store with this unique value already exists.'
          : error.message || 'Failed to create store.',
    });
  }
};

// Admin: PUT /api/store/update/:id
export const updateStore = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Invalid store ID.',
      });
    }

    const store = await Store.findById(req.params.id);

    if (!store || store.status === 'ARCHIVED') {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Store not found or archived.',
      });
    }

    const payload = { ...req.body };

    // Validate the complete resulting record, not just changed fields.
    const merged = {
      ...store.toObject(),
      ...payload,
    };

    const errors = validateStore(merged);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        error: true,
        message: errors.join(' '),
      });
    }

    const normalized = normalizeStoreData(merged);

    Object.assign(store, normalized);
    await store.save();

    return res.status(200).json({
      success: true,
      error: false,
      message: 'Store updated successfully.',
      data: store,
    });
  } catch (error) {
    console.error('UPDATE STORE ERROR:', error);

    return res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      error: true,
      message:
        error.code === 11000
          ? 'A store with this unique value already exists.'
          : error.message || 'Failed to update store.',
    });
  }
};

// Admin: PATCH /api/store/status/:id
export const updateStoreStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Invalid store ID.',
      });
    }

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Status must be ACTIVE or INACTIVE.',
      });
    }

    const store = await Store.findOneAndUpdate(
      {
        _id: req.params.id,
        status: { $ne: 'ARCHIVED' },
      },
      { $set: { status } },
      { new: true, runValidators: true },
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Store not found or archived.',
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      message: `Store status changed to ${status}.`,
      data: store,
    });
  } catch (error) {
    console.error('UPDATE STORE STATUS ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: 'Failed to update store status.',
    });
  }
};

// Admin: DELETE /api/store/delete/:id
// Archive instead of permanently deleting.
export const deleteStore = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Invalid store ID.',
      });
    }

    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'ARCHIVED' } },
      { new: true, runValidators: true },
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Store not found.',
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      message: 'Store archived successfully.',
      data: store,
    });
  } catch (error) {
    console.error('ARCHIVE STORE ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: 'Failed to archive store.',
    });
  }
};

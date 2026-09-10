import AddressModel from '../models/addresh.model.js';
import UserModel from '../models/user.model.js';

export const addAddressController = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      name,
      phone,
      addressLine1,
      city,
      state,
      postalCode,
      landmark,
      isDefault,
      addressType,
    } = req.body;

    if (!name || !phone || !addressLine1 || !city || !state || !postalCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    const existingAddresses = await AddressModel.find({ userId });

    const shouldBeDefault =
      existingAddresses.length === 0 ? true : isDefault || false;

    if (shouldBeDefault) {
      await AddressModel.updateMany(
        { userId },
        {
          $set: {
            isDefault: false,
          },
        },
      );
    }

    const address = await AddressModel.create({
      userId,
      name,
      phone,
      addressLine1,
      city,
      state,
      postalCode,
      landmark,
      addressType,
      isDefault: shouldBeDefault,
    });

    await UserModel.findByIdAndUpdate(userId, {
      $push: {
        address_details: address._id,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: address,
    });
  } catch (error) {
    console.error('Add Address Error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add address',
    });
  }
};

export const updateAddreesController = async (req, res) => {
  try {
    const userId = req.userId;
    const { addressId } = req.params;

    const {
      name,
      phone,
      addressLine1,
      city,
      state,
      postalCode,
      landmark,
      isDefault,
      addressType,
    } = req.body;

    const address = await AddressModel.findOne({
      _id: addressId,
      userId,
    });

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address not found',
      });
    }

    // If this address becomes default
    if (isDefault === true) {
      await AddressModel.updateMany(
        {
          userId,
          _id: { $ne: addressId },
        },
        {
          $set: {
            isDefault: false,
          },
        },
      );
    }

    address.name = name ?? address.name;
    address.phone = phone ?? address.phone;
    address.addressLine1 = addressLine1 ?? address.addressLine1;
    address.city = city ?? address.city;
    address.state = state ?? address.state;
    address.postalCode = postalCode ?? address.postalCode;
    address.landmark = landmark ?? address.landmark;
    address.addressType = addressType ?? address.addressType;

    if (typeof isDefault === 'boolean') {
      address.isDefault = isDefault;
    }

    // country is never updated
    // addressType is never updated

    await address.save();

    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address,
    });
  } catch (error) {
    console.error('Update Address Error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update address',
    });
  }
};

export const getAddressController = async (req, res) => {
  try {
    const userId = req.userId;

    const addresses = await AddressModel.find({
      userId,
    }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    console.error('Get Address Error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get addresses',
    });
  }
};

export const deleteAddressController = async (req, res) => {
  try {
    const userId = req.userId;
    const { addressId } = req.params;

    const address = await AddressModel.findOneAndDelete({
      _id: addressId,
      userId,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    // Remove address ID from User model
    await UserModel.findByIdAndUpdate(userId, {
      $pull: {
        address_details: addressId,
      },
    });

    // If deleted address was default,
    // make another address default
    if (address.isDefault) {
      const nextAddress = await AddressModel.findOne({
        userId,
      }).sort({
        createdAt: -1,
      });

      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    console.error('Delete Address Error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete address',
    });
  }
};

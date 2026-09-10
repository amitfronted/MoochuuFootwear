import Strap from '../models/strap.model.js';
import Product from '../models/product.model.js';

// *Create Strap*
export const createStrap = async (req, res) => {
  try {
    const { name, colors } = req.body;

    const newStrap = new Strap({
      name,
      colors,
      status: 'ACTIVE',
    });

    await newStrap.save();

    return res.status(201).json({
      success: true,
      error: false,
      message: 'Strap component created successfully',
      data: newStrap,
    });
  } catch (error) {
    console.error('CREATE STRAP ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};

// *Get All Straps*
export const getAllStraps = async (req, res) => {
  try {
    const straps = await Strap.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      error: false,
      data: straps,
    });
  } catch (error) {
    console.error('GET ALL STRAPS ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};

// *Update Strap*
export const updateStrap = async (req, res) => {
  try {
    const { id } = req.params;

    const strap = await Strap.findById(id);

    if (!strap) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Strap not found',
      });
    }

    // Archived components are locked
    if (strap.status === 'ARCHIVED') {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Archived strap cannot be edited',
      });
    }

    // Do not allow status changes through generic update
    const { status, ...updateData } = req.body;

    const updatedStrap = await Strap.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      success: true,
      error: false,
      message: 'Strap updated successfully',
      data: updatedStrap,
    });
  } catch (error) {
    console.error('UPDATE STRAP ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};

// *Check whether Strap can be archived*
export const checkStrapArchive = async (req, res) => {
  try {
    const { id } = req.params;

    const strap = await Strap.findById(id);

    if (!strap) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Strap not found',
      });
    }

    if (strap.status === 'ARCHIVED') {
      return res.status(200).json({
        success: true,
        error: false,
        canArchive: false,
        code: 'ALREADY_ARCHIVED',
        message: 'Strap is already archived',
      });
    }

    const activeProduct = await Product.findOne({
      status: 'ACTIVE',
      allowedStraps: {
        $in: [id],
      },
    }).select('_id productCode name');

    if (activeProduct) {
      return res.status(200).json({
        success: true,
        error: false,
        canArchive: false,
        code: 'COMPONENT_IN_USE',
        message: `Cannot archive this strap because it is used by active product "${activeProduct.name}". Deactivate the product first.`,
        data: {
          product: activeProduct,
        },
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      canArchive: true,
      message: 'Strap can be archived.',
    });
  } catch (error) {
    console.error('CHECK STRAP ARCHIVE ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to check strap archive status',
    });
  }
};

// *Archive Strap*
// *Archive Strap*
export const deleteStrap = async (req, res) => {
  try {
    const { id } = req.params;

    const strap = await Strap.findById(id);

    if (!strap) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Strap not found',
      });
    }

    if (strap.status === 'ARCHIVED') {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Strap is already archived',
      });
    }

    // -----------------------------------------
    // FINAL SAFETY CHECK
    // -----------------------------------------

    const activeProduct = await Product.findOne({
      status: 'ACTIVE',
      allowedStraps: {
        $in: [id],
      },
    }).select('_id productCode name');

    if (activeProduct) {
      return res.status(400).json({
        success: false,
        error: true,
        code: 'COMPONENT_IN_USE',
        message: `Cannot archive this strap because it is used by active product "${activeProduct.name}". Deactivate the product first.`,
        data: {
          product: activeProduct,
        },
      });
    }

    // -----------------------------------------
    // ARCHIVE
    // -----------------------------------------

    strap.status = 'ARCHIVED';

    await strap.save();

    return res.status(200).json({
      success: true,
      error: false,
      message: 'Strap archived successfully',
      data: strap,
    });
  } catch (error) {
    console.error('ARCHIVE STRAP ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to archive strap',
    });
  }
};

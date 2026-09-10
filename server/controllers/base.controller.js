import Base from '../models/base.model.js';
import Product from '../models/product.model.js';

export const createBase = async (req, res) => {
  try {
    const { name, colors } = req.body;

    const newBase = new Base({
      name,
      colors,
      status: 'ACTIVE',
    });

    await newBase.save();

    return res.status(201).json({
      success: true,
      error: false,
      message: 'Base component created successfully',
      data: newBase,
    });
  } catch (error) {
    console.error('CREATE BASE ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};

// *Get All Bases*
export const getAllBases = async (req, res) => {
  try {
    const bases = await Base.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      error: false,
      data: bases,
    });
  } catch (error) {
    console.error('GET ALL BASES ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};

// *Update Base*
export const updateBase = async (req, res) => {
  try {
    const { id } = req.params;

    const base = await Base.findById(id);

    if (!base) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Base not found',
      });
    }

    // Archived components are locked
    if (base.status === 'ARCHIVED') {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Archived base cannot be edited',
      });
    }

    // Do not allow status to be changed through this endpoint
    const { status, ...updateData } = req.body;

    const updatedBase = await Base.findByIdAndUpdate(
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
      message: 'Base updated successfully',
      data: updatedBase,
    });
  } catch (error) {
    console.error('UPDATE BASE ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};

// *Check whether Base can be archived*
// *Check whether Base can be archived*
export const checkBaseArchive = async (req, res) => {
  try {
    const { id } = req.params;

    const base = await Base.findById(id);

    if (!base) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Base not found',
      });
    }

    if (base.status === 'ARCHIVED') {
      return res.status(200).json({
        success: true,
        error: false,
        canArchive: false,
        code: 'ALREADY_ARCHIVED',
        message: 'Base is already archived',
      });
    }

    console.log('=================================');
    console.log('ARCHIVE CHECK - BASE');
    console.log('Base ID:', id);
    console.log('Base name:', base.name);
    console.log('Base status:', base.status);
    console.log('=================================');

    const activeProduct = await Product.findOne({
      status: 'ACTIVE',
      allowedBases: {
        $in: [id],
      },
    }).select('_id productCode name');

    console.log('ACTIVE PRODUCT USING BASE:', activeProduct);

    if (activeProduct) {
      return res.status(200).json({
        success: true,
        error: false,
        canArchive: false,
        code: 'COMPONENT_IN_USE',
        message: `Cannot archive this base because it is used by active product "${activeProduct.name}". Deactivate the product first.`,
        data: {
          product: activeProduct,
        },
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      canArchive: true,
      message: 'Base can be archived.',
    });
  } catch (error) {
    console.error('CHECK BASE ARCHIVE ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to check base archive status',
    });
  }
};

// *Archive Base*
export const deleteBase = async (req, res) => {
  try {
    const { id } = req.params;

    const base = await Base.findById(id);

    if (!base) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Base not found',
      });
    }

    if (base.status === 'ARCHIVED') {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Base is already archived',
      });
    }

    // -----------------------------------------
    // FINAL SAFETY CHECK
    // Check whether this Base is used by
    // any ACTIVE product
    // -----------------------------------------

    const activeProduct = await Product.findOne({
      status: 'ACTIVE',
      allowedBases: {
        $in: [id],
      },
    }).select('_id productCode name');

    if (activeProduct) {
      return res.status(400).json({
        success: false,
        error: true,
        code: 'COMPONENT_IN_USE',
        message: `Cannot archive this base because it is used by active product "${activeProduct.name}". Deactivate the product first.`,
        data: {
          product: activeProduct,
        },
      });
    }

    // -----------------------------------------
    // ARCHIVE BASE
    // -----------------------------------------

    base.status = 'ARCHIVED';

    await base.save();

    return res.status(200).json({
      success: true,
      error: false,
      message: 'Base archived successfully',
      data: base,
    });
  } catch (error) {
    console.error('ARCHIVE BASE ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to archive base',
    });
  }
};

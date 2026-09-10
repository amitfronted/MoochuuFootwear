import Thumb from '../models/thumb.model.js';
import Product from '../models/product.model.js';

// *Create Thumb*
export const createThumb = async (req, res) => {
  try {
    const { name, colors } = req.body;

    const newThumb = new Thumb({
      name,
      colors,
      status: 'ACTIVE',
    });

    await newThumb.save();

    return res.status(201).json({
      success: true,
      error: false,
      message: 'Thumb component created successfully',
      data: newThumb,
    });
  } catch (error) {
    console.error('CREATE THUMB ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};

// *Get All Thumbs*
export const getAllThumbs = async (req, res) => {
  try {
    const thumbs = await Thumb.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      error: false,
      data: thumbs,
    });
  } catch (error) {
    console.error('GET ALL THUMBS ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};

// *Update Thumb*
export const updateThumb = async (req, res) => {
  try {
    const { id } = req.params;

    const thumb = await Thumb.findById(id);

    if (!thumb) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Thumb not found',
      });
    }

    // Archived components are locked
    if (thumb.status === 'ARCHIVED') {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Archived thumb cannot be edited',
      });
    }

    // Do not allow status changes through generic update
    const { status, ...updateData } = req.body;

    const updatedThumb = await Thumb.findByIdAndUpdate(
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
      message: 'Thumb updated successfully',
      data: updatedThumb,
    });
  } catch (error) {
    console.error('UPDATE THUMB ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};

// *Check whether Thumb can be archived*
export const checkThumbArchive = async (req, res) => {
  try {
    const { id } = req.params;

    const thumb = await Thumb.findById(id);

    if (!thumb) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Thumb not found',
      });
    }

    if (thumb.status === 'ARCHIVED') {
      return res.status(200).json({
        success: true,
        error: false,
        canArchive: false,
        code: 'ALREADY_ARCHIVED',
        message: 'Thumb is already archived',
      });
    }

    const activeProduct = await Product.findOne({
      status: 'ACTIVE',
      allowedThumbs: {
        $in: [id],
      },
    }).select('_id productCode name');

    if (activeProduct) {
      return res.status(200).json({
        success: true,
        error: false,
        canArchive: false,
        code: 'COMPONENT_IN_USE',
        message: `Cannot archive this thumb because it is used by active product "${activeProduct.name}". Deactivate the product first.`,
        data: {
          product: activeProduct,
        },
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      canArchive: true,
      message: 'Thumb can be archived.',
    });
  } catch (error) {
    console.error('CHECK THUMB ARCHIVE ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to check thumb archive status',
    });
  }
};

// *Archive Thumb*
// *Archive Thumb*
export const deleteThumb = async (req, res) => {
  try {
    const { id } = req.params;

    const thumb = await Thumb.findById(id);

    if (!thumb) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Thumb not found',
      });
    }

    if (thumb.status === 'ARCHIVED') {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Thumb is already archived',
      });
    }

    // -----------------------------------------
    // FINAL SAFETY CHECK
    // -----------------------------------------

    const activeProduct = await Product.findOne({
      status: 'ACTIVE',
      allowedThumbs: {
        $in: [id],
      },
    }).select('_id productCode name');

    if (activeProduct) {
      return res.status(400).json({
        success: false,
        error: true,
        code: 'COMPONENT_IN_USE',
        message: `Cannot archive this thumb because it is used by active product "${activeProduct.name}". Deactivate the product first.`,
        data: {
          product: activeProduct,
        },
      });
    }

    // -----------------------------------------
    // ARCHIVE
    // -----------------------------------------

    thumb.status = 'ARCHIVED';

    await thumb.save();

    return res.status(200).json({
      success: true,
      error: false,
      message: 'Thumb archived successfully',
      data: thumb,
    });
  } catch (error) {
    console.error('ARCHIVE THUMB ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to archive thumb',
    });
  }
};

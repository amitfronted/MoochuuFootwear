import Product from '../models/product.model.js';
import cloudinary from '../config/cloudinary.js';

// Helper to sanitize schema payload based on productType
const sanitizeProductData = (data) => {
  const isStandard = data.productType === 'STANDARD';

  return {
    ...data,
    productType: data.productType || 'CUSTOMIZABLE',
    // Force component references to empty arrays if STANDARD
    allowedBases: isStandard ? [] : data.allowedBases || [],
    allowedStraps: isStandard ? [] : data.allowedStraps || [],
    allowedThumbs: isStandard ? [] : data.allowedThumbs || [],
    hasThumb: isStandard ? false : data.hasThumb || false,
    // Keep standardStock empty if CUSTOMIZABLE
    standardStock: isStandard ? data.standardStock || [] : [],
  };
};

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'moochuu-footwear/products',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    stream.end(fileBuffer);
  });
};

const deleteCloudinaryImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    /*
     * Example:
     *
     * https://res.cloudinary.com/xxx/image/upload/
     * v123/moochuu-footwear/products/abc.jpg
     *
     * We need:
     *
     * moochuu-footwear/products/abc
     */

    const uploadIndex = imageUrl.indexOf('/upload/');

    if (uploadIndex === -1) {
      return;
    }

    let publicId = imageUrl.substring(uploadIndex + 8);

    // Remove version
    publicId = publicId.replace(/^v\d+\//, '');

    // Remove extension
    publicId = publicId.replace(/\.[^/.]+$/, '');

    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
  }
};

export const createProduct = async (req, res) => {
  try {
    const { productCode } = req.body;

    const existingProduct = await Product.findOne({ productCode });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Product code already exists.',
      });
    }

    // Apply strict non-customizable rules
    const sanitizedData = sanitizeProductData(req.body);

    sanitizedData.status = 'DRAFT';

    const newProduct = new Product(sanitizedData);
    await newProduct.save();

    return res.status(201).json({
      success: true,
      error: false,
      message: 'Product created successfully as Draft',
      data: newProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to create product',
    });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const { category, productType, sort, page = 1, limit = 10 } = req.query;

    const query = {
      status: 'ACTIVE',
    };

    if (category) {
      query.category = category;
    }

    if (productType) {
      query.productType = productType;
    }

    // Determine Mongo sorting rule
    let sortOptions = { createdAt: -1 };

    if (sort === 'priceAsc') {
      sortOptions = { basePrice: 1 };
    } else if (sort === 'priceDesc') {
      sortOptions = { basePrice: -1 };
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const products = await Product.find(query)
      .populate('allowedBases')
      .populate('allowedStraps')
      .populate('allowedThumbs')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNumber);

    const totalProducts = await Product.countDocuments(query);

    return res.status(200).json({
      success: true,
      error: false,
      total: totalProducts,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProducts / limitNumber),
      data: products,
    });
  } catch (error) {
    console.error('GET ALL PRODUCTS ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to fetch products',
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      status: 'ACTIVE',
    })
      .populate('allowedBases')
      .populate('allowedStraps')
      .populate('allowedThumbs');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      data: product,
    });
  } catch (error) {
    console.error('GET PRODUCT BY ID ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to fetch product',
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Product not found',
      });
    }

    /*
     * -----------------------------------------
     * BASIC PRODUCT DATA
     * -----------------------------------------
     */

    const updateData = {
      productCode: req.body.productCode,
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      productType: req.body.productType,
      basePrice: Number(req.body.basePrice),
    };

    /*
     * -----------------------------------------
     * HAS THUMB
     * -----------------------------------------
     */

    updateData.hasThumb =
      req.body.productType === 'STANDARD'
        ? false
        : req.body.hasThumb === 'true' || req.body.hasThumb === true;

    /*
     * -----------------------------------------
     * CUSTOMIZABLE PRODUCT
     * -----------------------------------------
     */

    if (req.body.productType === 'CUSTOMIZABLE') {
      updateData.allowedBases = Array.isArray(req.body.allowedBases)
        ? req.body.allowedBases
        : req.body.allowedBases
          ? [req.body.allowedBases]
          : [];

      updateData.allowedStraps = Array.isArray(req.body.allowedStraps)
        ? req.body.allowedStraps
        : req.body.allowedStraps
          ? [req.body.allowedStraps]
          : [];

      updateData.allowedThumbs = Array.isArray(req.body.allowedThumbs)
        ? req.body.allowedThumbs
        : req.body.allowedThumbs
          ? [req.body.allowedThumbs]
          : [];

      updateData.standardStock = [];
    }

    /*
     * -----------------------------------------
     * STANDARD PRODUCT
     * -----------------------------------------
     */

    if (req.body.productType === 'STANDARD') {
      updateData.allowedBases = [];
      updateData.allowedStraps = [];
      updateData.allowedThumbs = [];
      updateData.hasThumb = false;

      try {
        updateData.standardStock = req.body.standardStock
          ? JSON.parse(req.body.standardStock)
          : [];
      } catch {
        updateData.standardStock = [];
      }
    }

    /*
     * -----------------------------------------
     * MAIN IMAGE
     * -----------------------------------------
     */

    const mainImageFile = req.files?.mainImageFile?.[0];

    if (mainImageFile) {
      const uploadedMain = await uploadToCloudinary(mainImageFile.buffer);

      updateData.mainImage = uploadedMain.url;

      // Delete old Cloudinary image if possible
      if (product.mainImage) {
        await deleteCloudinaryImage(product.mainImage);
      }
    } else {
      // Keep old main image
      updateData.mainImage = product.mainImage;
    }

    /*
     * -----------------------------------------
     * GALLERY IMAGES
     * -----------------------------------------
     */

    let existingGalleryImages = req.body.existingGalleryImages || [];

    if (!Array.isArray(existingGalleryImages)) {
      existingGalleryImages = existingGalleryImages
        ? [existingGalleryImages]
        : [];
    }

    /*
     * Upload new gallery files
     */

    const newGalleryFiles = req.files?.galleryImages || [];

    let newGalleryImages = [];

    if (newGalleryFiles.length > 0) {
      newGalleryImages = await Promise.all(
        newGalleryFiles.map(async (file) => {
          const result = await uploadToCloudinary(file.buffer);

          return result.url;
        }),
      );
    }

    /*
     * Delete gallery images removed
     * from the edit page
     */

    const oldGalleryImages = product.galleryImages || [];

    const removedGalleryImages = oldGalleryImages.filter(
      (image) => !existingGalleryImages.includes(image),
    );

    await Promise.all(
      removedGalleryImages.map((image) => deleteCloudinaryImage(image)),
    );

    /*
     * Final gallery
     */

    updateData.galleryImages = [...existingGalleryImages, ...newGalleryImages];

    /*
     * -----------------------------------------
     * UPDATE DATABASE
     * -----------------------------------------
     */

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate('allowedBases')
      .populate('allowedStraps')
      .populate('allowedThumbs');

    return res.status(200).json({
      success: true,
      error: false,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    console.error('UPDATE PRODUCT ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to update product',
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Product not found',
      });
    }

    // Already archived
    if (product.status === 'ARCHIVED') {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Product is already archived',
      });
    }

    // Archive instead of permanently deleting
    product.status = 'ARCHIVED';

    await product.save();

    return res.status(200).json({
      success: true,
      error: false,
      message: 'Product archived successfully',
      data: product,
    });
  } catch (error) {
    console.error('ARCHIVE PRODUCT ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to archive product',
    });
  }
};

const buildActivationChecklist = (product) => {
  const checks = [];

  const addCheck = (key, label, passed, message) => {
    checks.push({ key, label, passed: Boolean(passed), message });
  };

  addCheck(
    'productCode',
    'Product code',
    Boolean(product.productCode?.trim()),
    product.productCode?.trim()
      ? 'Product code is available.'
      : 'Product code is required.',
  );

  addCheck(
    'name',
    'Product name',
    Boolean(product.name?.trim()),
    product.name?.trim()
      ? 'Product name is available.'
      : 'Product name is required.',
  );

  addCheck(
    'description',
    'Product description',
    Boolean(product.description?.trim()),
    product.description?.trim()
      ? 'Description is available.'
      : 'Add a product description before activation.',
  );

  addCheck(
    'price',
    'Selling price',
    Number.isFinite(Number(product.basePrice)) && Number(product.basePrice) > 0,
    Number(product.basePrice) > 0
      ? 'Valid selling price.'
      : 'Selling price must be greater than ₹0.',
  );

  addCheck(
    'mainImage',
    'Main product image',
    Boolean(product.mainImage?.trim()),
    product.mainImage?.trim()
      ? 'Main image is available.'
      : 'Upload a main product image.',
  );

  if (product.productType === 'STANDARD') {
    const stock = Array.isArray(product.standardStock)
      ? product.standardStock
      : [];
    const validSizes = stock.filter(
      (item) =>
        String(item?.size || '').trim() && Number(item?.stockQuantity) >= 0,
    );

    addCheck(
      'standardStock',
      'Standard size/stock configuration',
      validSizes.length > 0,
      validSizes.length > 0
        ? `${validSizes.length} size variant(s) configured.`
        : 'Add at least one valid size and stock variant.',
    );
  } else {
    const bases = Array.isArray(product.allowedBases)
      ? product.allowedBases.filter(Boolean)
      : [];
    const straps = Array.isArray(product.allowedStraps)
      ? product.allowedStraps.filter(Boolean)
      : [];
    const thumbs = Array.isArray(product.allowedThumbs)
      ? product.allowedThumbs.filter(Boolean)
      : [];

    addCheck(
      'bases',
      'Base component',
      bases.length > 0,
      bases.length > 0
        ? `${bases.length} base component(s) selected.`
        : 'Select at least one base component.',
    );

    addCheck(
      'straps',
      'Strap component',
      straps.length > 0,
      straps.length > 0
        ? `${straps.length} strap component(s) selected.`
        : 'Select at least one strap component.',
    );

    if (product.hasThumb) {
      addCheck(
        'thumbs',
        'Thumb component',
        thumbs.length > 0,
        thumbs.length > 0
          ? `${thumbs.length} thumb component(s) selected.`
          : 'Thumb is enabled, so select at least one thumb component.',
      );
    }
  }

  return checks;
};

export const checkProductActivation = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('allowedBases')
      .populate('allowedStraps')
      .populate('allowedThumbs');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Product not found',
      });
    }

    const checks = buildActivationChecklist(product);
    const canActivate = checks.every((check) => check.passed);

    return res.status(200).json({
      success: true,
      error: false,
      data: {
        product: {
          _id: product._id,
          productCode: product.productCode,
          name: product.name,
          productType: product.productType,
          status: product.status,
          basePrice: product.basePrice,
          mainImage: product.mainImage,
        },
        canActivate,
        checks,
      },
    });
  } catch (error) {
    console.error('CHECK PRODUCT ACTIVATION ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to check product readiness',
    });
  }
};

export const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

    // Validate status
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: `Invalid product status. Allowed values: ${allowedStatuses.join(', ')}`,
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Product not found',
      });
    }

    const currentStatus = product.status;

    // -----------------------------------------
    // STATUS TRANSITIONS
    // -----------------------------------------

    const allowedTransitions = {
      DRAFT: ['ACTIVE', 'INACTIVE'],
      ACTIVE: ['INACTIVE'],
      INACTIVE: ['ACTIVE', 'ARCHIVED'],
      ARCHIVED: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: `Cannot change product status from ${currentStatus} to ${status}`,
      });
    }

    // Never allow an incomplete product to become public.
    if (status === 'ACTIVE') {
      const populatedProduct = await Product.findById(id)
        .populate('allowedBases')
        .populate('allowedStraps')
        .populate('allowedThumbs');

      const checks = buildActivationChecklist(populatedProduct);
      const failedChecks = checks.filter((check) => !check.passed);

      if (failedChecks.length > 0) {
        return res.status(400).json({
          success: false,
          error: true,
          code: 'PRODUCT_NOT_READY_FOR_ACTIVATION',
          message: 'Product is not ready for activation.',
          data: {
            canActivate: false,
            checks,
          },
        });
      }
    }

    product.status = status;

    await product.save();

    return res.status(200).json({
      success: true,
      error: false,
      message: `Product status changed from ${currentStatus} to ${status}`,
      data: product,
    });
  } catch (error) {
    console.error('UPDATE PRODUCT STATUS ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to update product status',
    });
  }
};

export const getAllProductsAdmin = async (req, res) => {
  try {
    const { category, productType, status } = req.query;

    const query = {};

    if (category) {
      query.category = category;
    }

    if (productType) {
      query.productType = productType;
    }

    if (status) {
      query.status = status;
    }

    const products = await Product.find(query)
      .populate('allowedBases')
      .populate('allowedStraps')
      .populate('allowedThumbs')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      error: false,
      total: products.length,
      data: products,
    });
  } catch (error) {
    console.error('ADMIN GET ALL PRODUCTS ERROR:', error);

    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to fetch admin products',
    });
  }
};

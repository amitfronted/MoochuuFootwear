import cloudinary from '../config/cloudinary.js';

// Stream upload helper
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'moochuu-footwear',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(fileBuffer);
  });
};

// Single Image Upload (Base, Strap, Thumb, Main Product Image)
export const uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'No file uploaded',
      });
    }

    const imageUrl = await uploadToCloudinary(req.file.buffer);

    return res.status(200).json({
      success: true,
      error: false,
      message: 'Image uploaded successfully',
      url: imageUrl,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Image upload failed',
    });
  }
};

// Multiple Images Upload (Product Gallery)
export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'No files uploaded',
      });
    }

    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer),
    );
    const imageUrls = await Promise.all(uploadPromises);

    return res.status(200).json({
      success: true,
      error: false,
      message: 'Images uploaded successfully',
      urls: imageUrls,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Gallery upload failed',
    });
  }
};

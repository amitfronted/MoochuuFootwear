import UserModel from '../models/user.model.js';
import cloudinary from '../config/cloudinary.js';

export async function updateAvatarController(request, response) {
  try {
    const userId = request.user._id;

    // console.log('User ID:', userId);
    // console.log('File:', request.file);

    if (!request.file) {
      return response.status(400).json({
        message: 'Please select an image',
        error: true,
        success: false,
      });
    }

    // Upload buffer to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:${request.file.mimetype};base64,${request.file.buffer.toString('base64')}`,
      {
        folder: 'moochuu/avatars',
        resource_type: 'image',
      },
    );

    //console.log('UPLOAD SUCCESS:', uploadResult.secure_url);

    // Update user avatar in MongoDB
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          avatar: uploadResult.secure_url,
        },
      },
      {
        new: true,
      },
    ).select('-password -refreshToken -accessToken');

    if (!user) {
      return response.status(404).json({
        message: 'User not found',
        error: true,
        success: false,
      });
    }

    //console.log('MongoDB avatar updated:', user.avatar);

    return response.status(200).json({
      message: 'Avatar updated successfully',
      error: false,
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    //console.error('Avatar upload error:', error);

    return response.status(500).json({
      message: error.message || 'Avatar upload failed',
      error: true,
      success: false,
    });
  }
}

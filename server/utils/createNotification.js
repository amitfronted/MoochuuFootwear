import UserModel from '../models/user.model.js';
import Notification from '../models/notification.model.js';

export const notifyAdmins = async ({
  type,
  title,
  message,
  orderId = null,
  orderNumber = '',
  data = {},
}) => {
  try {
    const admins = await UserModel.find({
      role: {
        $in: ['ADMIN', 'SUPER_ADMIN'],
      },
    }).select('_id');

    if (!admins.length) {
      return;
    }

    const notifications = admins.map((admin) => ({
      recipient: admin._id,
      type,
      title,
      message,
      orderId,
      orderNumber,
      data,
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    // Notification failure must NEVER break
    // order creation/status update.
    console.error('Create notification error:', error);
  }
};

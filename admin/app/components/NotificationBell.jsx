'use client';

import { useEffect, useRef, useState } from 'react';

import {
  FiBell,
  FiShoppingBag,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
} from 'react-icons/fi';

import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../lib/api';

const getIcon = (type) => {
  switch (type) {
    case 'NEW_ORDER':
      return <FiShoppingBag size={18} />;

    case 'ORDER_STATUS':
      return <FiTruck size={18} />;

    case 'ORDER_CANCELLED':
      return <FiXCircle size={18} />;

    case 'LOW_STOCK':
      return <FiAlertTriangle size={18} />;

    case 'PAYMENT':
      return <FiCheckCircle size={18} />;

    default:
      return <FiBell size={18} />;
  }
};

const timeAgo = (date) => {
  if (!date) return '';

  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(date).toLocaleDateString('en-IN');
};

export default function NotificationBell() {
  const router = useRouter();

  const wrapperRef = useRef(null);

  const [open, setOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const response = await fetchNotifications();

      if (response.success) {
        setNotifications(response.data || []);

        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.error('Notification error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Check for new notifications
    // every 15 seconds.
    const interval = setInterval(loadNotifications, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markNotificationRead(notification._id);

        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id
              ? {
                  ...item,
                  isRead: true,
                }
              : item,
          ),
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      setOpen(false);

      if (notification.orderId) {
        router.push(`/dashboard/orders?orderId=${notification.orderId}`);
      }
    } catch (error) {
      toast.error('Unable to open notification');
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    try {
      await markAllNotificationsRead();

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        })),
      );

      setUnreadCount(0);

      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Unable to update notifications');
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* BELL */}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        className="
          relative
          flex
          items-center
          justify-center
          w-10
          h-10
          rounded-full
          hover:bg-slate-100
          dark:hover:bg-neutral-800
          transition
        "
      >
        <FiBell size={21} />

        {unreadCount > 0 && (
          <span
            className="
              absolute
              -top-0.5
              -right-0.5
              min-w-5
              h-5
              px-1
              rounded-full
              bg-red-500
              text-white
              text-[10px]
              font-bold
              flex
              items-center
              justify-center
              border-2
              border-white
              dark:border-neutral-900
            "
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN */}

      {open && (
        <div
          className="
            absolute
            right-0
            top-full
            mt-3
            w-90
            max-w-[calc(100vw-24px)]
            bg-white
            dark:bg-neutral-900
            border
            border-slate-200
            dark:border-neutral-700
            rounded-xl
            shadow-xl
            overflow-hidden
            z-50
          "
        >
          {/* HEADER */}

          <div
            className="
              flex
              items-center
              justify-between
              px-4
              py-3
              border-b
              border-slate-200
              dark:border-neutral-700
            "
          >
            <div>
              <h3 className="font-bold">Notifications</h3>

              {unreadCount > 0 && (
                <p className="text-xs text-slate-500">{unreadCount} unread</p>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="
                  text-xs
                  text-blue-600
                  hover:underline
                "
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* LIST */}

          <div className="max-h-105 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <FiBell size={28} className="mx-auto text-slate-300" />

                <p className="mt-2 text-sm text-slate-500">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                      w-full
                      text-left
                      flex
                      gap-3
                      px-4
                      py-3
                      border-b
                      border-slate-100
                      dark:border-neutral-800
                      hover:bg-slate-50
                      dark:hover:bg-neutral-800
                      transition
                      ${
                        !notification.isRead
                          ? 'bg-blue-50/50 dark:bg-blue-950/20'
                          : ''
                      }
                    `}
                >
                  {/* ICON */}

                  <div
                    className={`
                        shrink-0
                        w-9
                        h-9
                        rounded-full
                        flex
                        items-center
                        justify-center
                        ${
                          notification.type === 'ORDER_CANCELLED'
                            ? 'bg-red-100 text-red-600'
                            : notification.type === 'NEW_ORDER'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-blue-100 text-blue-600'
                        }
                      `}
                  >
                    {getIcon(notification.type)}
                  </div>

                  {/* CONTENT */}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p
                        className={`
                            text-sm
                            ${
                              !notification.isRead ? 'font-bold' : 'font-medium'
                            }
                          `}
                      >
                        {notification.title}
                      </p>

                      {!notification.isRead && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>

                    <p className="text-[11px] text-slate-400 mt-1">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* FOOTER */}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push('/dashboard/orders');
            }}
            className="
              w-full
              py-3
              text-sm
              font-semibold
              border-t
              border-slate-200
              dark:border-neutral-700
              hover:bg-slate-50
              dark:hover:bg-neutral-800
            "
          >
            View All Orders
          </button>
        </div>
      )}
    </div>
  );
}

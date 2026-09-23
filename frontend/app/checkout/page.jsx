'use client';

import Image from 'next/image';
import { useContext, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiMapPin, FiCreditCard, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { MyContext } from '../context/MyContext';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import ProtectedRoute from '../components/ProtectedRoute';
import EmptyAddressBox from '../components/EmptyAddressBox';
import Loader from '../components/Loader';
import MenuButton from '../components/Buttons/MenuButton';
import { useAuth } from '../context/AuthContext';
import { calculateShippingCharge } from '@/utilis/shipping';
import { calculateTax } from '@/utilis/tax';
import { validateCoupon } from '../lib/api';

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const Checkout = () => {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const { items, subtotal, cartLoading, getCart } = useCart();
  const {
    createOrder,
    loading: orderLoading,
    createRazorpayOrder,
    verifyRazorpayPayment,
  } = useOrders();

  const {
    openAddressPanel,
    addresses,
    addressLoading,
    deleteAddress,
    getAddresses,
  } = useContext(MyContext);

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const discountedSubtotal = Math.max(
    Number(subtotal || 0) - Number(couponDiscount || 0),
    0,
  );

  const shippingCharge = calculateShippingCharge(discountedSubtotal);
  const tax = calculateTax(discountedSubtotal);

  const total = discountedSubtotal + shippingCharge + tax;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');

      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      getAddresses();
      getCart();
    }
  }, [user, authLoading, getAddresses, getCart]);

  useEffect(() => {
    if (!selectedAddress && addresses.length) {
      const defaultAddress =
        addresses.find((address) => address.isDefault) || addresses[0];
      setSelectedAddress(defaultAddress._id);
    }
  }, [addresses, selectedAddress]);

  const selectedAddressData = useMemo(
    () => addresses.find((address) => address._id === selectedAddress),
    [addresses, selectedAddress],
  );

  const handleOnlinePayment = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address.');
      return;
    }

    try {
      setIsPlacingOrder(true);

      // 1. Load Razorpay Checkout
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        toast.error('Unable to load Razorpay. Please try again.');
        return;
      }

      // 2. Create Razorpay order on our server
      const result = await createRazorpayOrder({
        addressId: selectedAddress,
        couponCode: appliedCoupon?.code || '',
      });

      if (!result?.success || !result?.data?.razorpayOrderId) {
        toast.error(result?.message || 'Unable to create payment order.');
        return;
      }

      const { razorpayOrderId, amount, currency, keyId } = result.data;

      // 3. Open Razorpay Checkout
      const options = {
        key: keyId,

        amount,
        currency,

        name: 'Moochuu Footwear',
        description: 'Footwear Purchase',

        order_id: razorpayOrderId,

        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.mobile || user?.phone || '',
        },

        theme: {
          color: '#000000',
        },

        handler: async function (response) {
          console.log('RAZORPAY PAYMENT SUCCESS:', response);

          try {
            setIsPlacingOrder(true);

            const verifyResult = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,

              razorpay_payment_id: response.razorpay_payment_id,

              razorpay_signature: response.razorpay_signature,

              addressId: selectedAddress,
            });

            if (!verifyResult?.success) {
              toast.error(
                verifyResult?.message || 'Payment verification failed.',
              );

              return;
            }

            /**
             * Payment + order successful
             */
            window.dispatchEvent(new Event('cart-updated'));

            toast.success('Payment successful. Order placed!');

            const orderId = verifyResult.data?.order?._id;

            if (orderId) {
              router.push(`/order-success?orderId=${orderId}`);
            } else {
              router.push('/my-account/my-orders');
            }
          } catch (error) {
            console.error('Payment verification error:', error);

            toast.error(
              error?.message ||
                'Payment was successful, but order verification failed. Please contact support.',
            );
          } finally {
            setIsPlacingOrder(false);
          }
        },

        modal: {
          ondismiss: function () {
            console.log('Razorpay checkout closed.');
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', function (response) {
        console.log('RAZORPAY PAYMENT FAILED:', response.error);

        toast.error(
          response.error?.description || 'Payment failed. Please try again.',
        );
      });

      razorpay.open();
    } catch (error) {
      console.error('Razorpay error:', error);

      toast.error(
        error?.message || 'Something went wrong with online payment.',
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleDelete = (addressId) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="font-medium">
            Are you sure you want to delete this address?
          </p>

          <div className="flex gap-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id);

                try {
                  const response = await deleteAddress(addressId);

                  if (response?.success) {
                    if (selectedAddress === addressId) {
                      setSelectedAddress(null);
                    }
                    toast.success(
                      response.message || 'Address deleted successfully',
                    );
                  }
                } catch (error) {
                  toast.error(
                    error?.response?.data?.message ||
                      error?.message ||
                      'Failed to delete address',
                  );
                }
              }}
              className="rounded bg-red-500 px-3 py-1 text-sm text-white"
            >
              Delete
            </button>

            <button
              onClick={() => toast.dismiss(t.id)}
              className="rounded bg-gray-200 px-3 py-1 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: Infinity },
    );
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address.');
      return;
    }

    if (!items.length) {
      toast.error('Your cart is empty.');
      router.push('/cart');
      return;
    }

    if (paymentMethod === 'ONLINE') {
      await handleOnlinePayment();
      return;
    }

    const result = await createOrder({
      addressId: selectedAddress,
      paymentMethod,
      couponCode: appliedCoupon?.code || '',
    });

    if (!result?.success) {
      toast.error(result?.message || 'Unable to place order.');
      await getCart();
      return;
    }

    window.dispatchEvent(new Event('cart-updated'));

    toast.success('Order placed successfully.');

    const orderId = result.data?.order?._id;

    if (orderId) {
      router.push(`/order-success?orderId=${orderId}`);
    } else {
      router.push('/my-account/my-orders');
    }
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();

    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    try {
      setCouponLoading(true);
      setCouponError('');

      const response = await validateCoupon({
        code,
        subtotal,
      });

      if (!response?.success) {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponError(response?.message || 'Unable to apply coupon.');
        return;
      }

      const discount = Number(
        response?.data?.discount ?? response?.data?.couponDiscount ?? 0,
      );

      setAppliedCoupon(response?.data?.coupon || null);
      setCouponDiscount(discount);
      setCouponError('');
    } catch (error) {
      setAppliedCoupon(null);
      setCouponDiscount(0);

      setCouponError(
        error.response?.data?.message ||
          error.message ||
          'Unable to apply coupon.',
      );
    } finally {
      setCouponLoading(false);
    }
  };

  if (cartLoading || authLoading) {
    return (
      <ProtectedRoute>
        <section className="min-h-[70vh] bg-gray-100 px-4 py-20">
          <div className="flex justify-center py-20">
            <Loader />
          </div>
        </section>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <section className="min-h-screen bg-gray-100 px-4 py-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">Checkout</h1>
            <p className="mt-1 text-sm text-gray-500">
              Confirm your address, review your footwear and place your order.
            </p>
          </div>

          {!items.length ? (
            <div className="rounded-md border border-gray-200 bg-white p-12 text-center shadow-sm">
              <FiPackage className="mx-auto mb-4 text-4xl text-gray-400" />
              <h2 className="text-xl font-semibold">Your cart is empty</h2>
              <p className="mt-2 text-gray-500">
                Add a footwear product before continuing to checkout.
              </p>
              <button
                onClick={() => router.push('/shop')}
                className="mt-6 rounded-md bg-yellow px-6 py-3 font-semibold text-black"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                {/* ADDRESS */}
                <div className="rounded-md border border-slate-300 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-200 p-5">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                        <FiMapPin /> Delivery Address
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Select where you want your order delivered.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openAddressPanel()}
                      className="flex items-center gap-1 rounded-md bg-yellow px-4 py-2 text-sm font-semibold text-black"
                    >
                      <FiPlus /> Add Address
                    </button>
                  </div>

                  <div className="space-y-4 p-5">
                    {addressLoading && !addresses.length ? (
                      <div className="flex justify-center py-10">
                        <Loader />
                      </div>
                    ) : !addresses.length ? (
                      <EmptyAddressBox openAddressPanel={openAddressPanel} />
                    ) : (
                      addresses.map((address) => (
                        <div
                          key={address._id}
                          className={`flex items-start justify-between rounded-md border p-4 transition flex-col sm:flex-row gap-4 sm:gap-0 ${
                            selectedAddress === address._id
                              ? 'border-amber-600 bg-amber-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <label
                            htmlFor={`checkout-address-${address._id}`}
                            className="flex cursor-pointer gap-3 items-start w-full"
                          >
                            <input
                              id={`checkout-address-${address._id}`}
                              type="radio"
                              name="checkout-address"
                              checked={selectedAddress === address._id}
                              onChange={() => setSelectedAddress(address._id)}
                              className="mt-1 h-5 w-5 accent-amber-500"
                            />

                            <span>
                              <span className="mb-1 inline-block rounded bg-amber-200 px-2 py-1 text-xs font-bold">
                                {address.addressType || 'Home'}
                              </span>
                              <span className="block font-semibold text-gray-900">
                                {address.name}
                              </span>
                              <span className="mt-1 block text-sm text-gray-700">
                                {address.addressLine1}
                              </span>
                              <span className="block text-sm text-gray-700">
                                {address.city}, {address.state} -{' '}
                                {address.postalCode}
                              </span>
                              {address.landmark && (
                                <span className="block text-sm text-gray-500">
                                  Landmark: {address.landmark}
                                </span>
                              )}
                              <span className="mt-1 block text-sm font-medium text-gray-800">
                                {address.phone}
                              </span>
                            </span>
                          </label>

                          <MenuButton
                            onEdit={() => openAddressPanel(address)}
                            onDelete={() => handleDelete(address._id)}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* PAYMENT */}
                <div className="rounded-md border border-slate-300 bg-white shadow-sm">
                  <div className="border-b border-gray-200 p-5">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <FiCreditCard /> Payment Method
                    </h2>
                  </div>

                  <div className="space-y-3 p-5">
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 ${
                        paymentMethod === 'COD'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="COD"
                        checked={paymentMethod === 'COD'}
                        onChange={(event) =>
                          setPaymentMethod(event.target.value)
                        }
                        className="h-5 w-5 accent-amber-500"
                      />
                      <span>
                        <span className="block font-semibold">
                          Cash on Delivery
                        </span>
                        <span className="text-sm text-gray-500">
                          Pay when your footwear is delivered.
                        </span>
                      </span>
                    </label>

                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 ${
                        paymentMethod === 'ONLINE'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="ONLINE"
                        checked={paymentMethod === 'ONLINE'}
                        onChange={(event) =>
                          setPaymentMethod(event.target.value)
                        }
                        className="h-5 w-5 accent-amber-500"
                      />
                      <span>
                        <span className="block font-semibold">
                          Online Payment
                        </span>
                        <span className="text-sm text-gray-500">
                          Pay securely using Razorpay.
                        </span>
                      </span>
                    </label>

                    {paymentMethod === 'ONLINE' && (
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                        You will be redirected to Razorpay secure checkout to
                        complete your payment.
                      </div>
                    )}
                  </div>
                </div>

                {/* ADDRESS PREVIEW */}
                {selectedAddressData && (
                  <div className="rounded-md border border-green-200 bg-green-50 p-5">
                    <p className="text-sm font-semibold text-green-800">
                      Delivering to
                    </p>
                    <p className="mt-1 text-sm text-green-900">
                      {selectedAddressData.name},{' '}
                      {selectedAddressData.addressLine1},{' '}
                      {selectedAddressData.city}, {selectedAddressData.state} -{' '}
                      {selectedAddressData.postalCode}
                    </p>
                  </div>
                )}
              </div>

              {/* ORDER SUMMARY */}
              <aside className="h-max lg:sticky lg:top-28">
                <div className="rounded-md border border-slate-300 bg-white shadow-sm">
                  <div className="border-b border-gray-200 p-5">
                    <h2 className="text-lg font-semibold text-gray-800">
                      Your Order
                    </h2>
                  </div>

                  <div
                    id="yourOrder"
                    className="max-h-56 space-y-3 overflow-y-auto p-5"
                  >
                    {items.map((item) => {
                      const standardImage = item.image;
                      const baseImage = item.base?.image;
                      const strapImage = item.strap?.image;
                      const thumbImage = item.thumb?.image;
                      return (
                        <div
                          key={item._id}
                          className="flex gap-3 border-b border-gray-100 pb-3"
                        >
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                            {item.productType === 'STANDARD' && (
                              <Image
                                src={standardImage}
                                alt={item.name}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            )}
                            {item.productType === 'CUSTOMIZABLE' && (
                              <>
                                <Image
                                  src={baseImage}
                                  alt={item.name}
                                  fill
                                  sizes="64px"
                                  className="object-cover"
                                />
                                <Image
                                  src={strapImage}
                                  alt={item.name}
                                  fill
                                  sizes="64px"
                                  className="object-cover"
                                />
                                {item.thumb?.image && (
                                  <Image
                                    src={thumbImage}
                                    alt={item.name}
                                    fill
                                    sizes="64px"
                                    className="object-cover"
                                  />
                                )}
                              </>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold text-gray-800">
                              {item.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                              Size: {item.size} · Qty: {item.quantity}
                            </p>

                            {item.productType === 'CUSTOMIZABLE' && (
                              <p className="mt-1 text-xs text-gray-500">
                                {item.base?.colorName || 'Sole'} /{' '}
                                {item.strap?.colorName || 'Strap'}
                                {item.thumb?.colorName
                                  ? ` / ${item.thumb.colorName}`
                                  : ''}
                              </p>
                            )}
                          </div>

                          <span className="text-sm font-semibold text-gray-800">
                            {money(
                              Number(item.basePrice || 0) *
                                Number(item.quantity || 0),
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4 border-t border-gray-200 p-5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-semibold">{money(subtotal)}</span>
                    </div>

                    {couponDiscount > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Coupon Discount</span>
                        <span className="text-green-600">
                          -₹{Number(couponDiscount).toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-gray-500">Shipping</span>
                      <span className="font-semibold">
                        {shippingCharge ? money(shippingCharge) : 'FREE'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">GST (18%)</span>
                      <span className="font-semibold">{money(tax)}</span>
                    </div>

                    <div className="mb-6">
                      <label
                        htmlFor="couponCode"
                        className="mb-2 block text-sm font-medium"
                      >
                        Coupon Code
                      </label>

                      <div className="flex gap-2">
                        <input
                          id="couponCode"
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError('');
                          }}
                          placeholder="Enter coupon code"
                          disabled={couponLoading || !!appliedCoupon}
                          className="flex-1 rounded-md border px-3 py-2 text-sm outline-none"
                        />

                        {appliedCoupon ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedCoupon(null);
                              setCouponDiscount(0);
                              setCouponCode('');
                              setCouponError('');
                            }}
                            className="rounded-md border px-4 py-2 text-sm"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={couponLoading || !couponCode.trim()}
                            className="rounded-md px-4 py-2 text-sm"
                          >
                            {couponLoading ? 'Applying...' : 'Apply'}
                          </button>
                        )}
                      </div>

                      {couponError && (
                        <p className="mt-2 text-sm text-red-600">
                          {couponError}
                        </p>
                      )}

                      {appliedCoupon && (
                        <p className="mt-2 text-sm text-green-600">
                          Coupon "{appliedCoupon.code || couponCode}" applied
                          successfully.
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between border-t border-gray-200 pt-4 text-base">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-gray-900">
                        {money(total)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={
                        orderLoading ||
                        isPlacingOrder ||
                        !selectedAddress ||
                        !items.length
                      }
                      onClick={handlePlaceOrder}
                      className="w-full rounded-md bg-yellow px-4 py-3 font-semibold text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {orderLoading || isPlacingOrder
                        ? 'Processing...'
                        : paymentMethod === 'ONLINE'
                          ? 'Pay Now'
                          : 'Place Order'}
                    </button>

                    <p className="text-center text-xs text-gray-500">
                      Stock is checked again on the server before your order is
                      confirmed.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </ProtectedRoute>
  );
};

export default Checkout;

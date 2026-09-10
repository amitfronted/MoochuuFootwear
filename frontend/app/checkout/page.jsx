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

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Checkout = () => {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const { items, subtotal, cartLoading, getCart } = useCart();
  const { createOrder, loading: orderLoading } = useOrders();

  const {
    openAddressPanel,
    addresses,
    addressLoading,
    deleteAddress,
    getAddresses,
  } = useContext(MyContext);

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD');

  const shippingCharge = 0;
  const tax = 0;
  const total = Number(subtotal || 0) + shippingCharge + tax;

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

    const result = await createOrder({
      addressId: selectedAddress,
      paymentMethod,
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
      <section className="mt-22 min-h-screen bg-gray-100 px-4 py-12 md:px-8">
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
                          className={`flex items-start justify-between rounded-md border p-4 transition ${
                            selectedAddress === address._id
                              ? 'border-amber-600 bg-amber-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <label
                            htmlFor={`checkout-address-${address._id}`}
                            className="flex cursor-pointer gap-3"
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
                          Payment gateway integration can be connected next.
                        </span>
                      </span>
                    </label>

                    {paymentMethod === 'ONLINE' && (
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                        Online payment is not connected yet. Choose Cash on
                        Delivery to place an order now.
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

                    <div className="flex justify-between">
                      <span className="text-gray-500">Shipping</span>
                      <span className="font-semibold">
                        {shippingCharge ? money(shippingCharge) : 'FREE'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax</span>
                      <span className="font-semibold">{money(tax)}</span>
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
                        !selectedAddress ||
                        !items.length ||
                        paymentMethod === 'ONLINE'
                      }
                      onClick={handlePlaceOrder}
                      className="w-full rounded-md bg-yellow px-4 py-3 font-semibold text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {orderLoading ? 'Placing Order...' : 'Place Order'}
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

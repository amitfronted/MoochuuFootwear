'use client';

import { useCallback, useState } from 'react';

import { MyContext } from './MyContext';

import api from '../lib/axios';

const ThemeProvider = ({ children }) => {
  /* ========================================
     ADDRESS DRAWER
  ======================================== */

  const [isOpenAddressBox, setIsOpenAddressBox] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState(null);

  /* ========================================
     ADDRESSES
  ======================================== */

  const [addresses, setAddresses] = useState([]);

  const [addressLoading, setAddressLoading] = useState(false);

  /* ========================================
     OPEN ADDRESS DRAWER
  ======================================== */

  const openAddressPanel = useCallback((address = null) => {
    setSelectedAddress(address);

    setIsOpenAddressBox(true);
  }, []);

  /* ========================================
     CLOSE ADDRESS DRAWER
  ======================================== */

  const closeAddressPanel = useCallback(() => {
    setIsOpenAddressBox(false);

    setSelectedAddress(null);
  }, []);

  /* ========================================
     GET ADDRESSES
  ======================================== */

  const getAddresses = useCallback(async () => {
    try {
      setAddressLoading(true);

      const response = await api.get('/address');

      if (response.data?.success) {
        const data = response.data?.data;

        /*
         * Supports both:
         *
         * data: [...]
         *
         * and:
         *
         * data: {
         *   addresses: [...]
         * }
         */

        const addressList = Array.isArray(data)
          ? data
          : Array.isArray(data?.addresses)
            ? data.addresses
            : [];

        setAddresses(addressList);
      }

      return response.data;
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || 'Address not found';

      throw new Error(message);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  /* ========================================
     ADD ADDRESS
  ======================================== */

  const addAddress = useCallback(async (formData) => {
    try {
      setAddressLoading(true);

      const response = await api.post('/address/add-address', formData);

      if (response.data?.success) {
        /*
         * Supports:
         *
         * data: address
         *
         * OR:
         *
         * data: {
         *   address: address
         * }
         */

        const data = response.data?.data;

        const newAddress = data?.address || data;

        if (newAddress && typeof newAddress === 'object') {
          setAddresses((prev) => [...prev, newAddress]);
        }
      }

      return response.data;
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || 'Address not added';

      throw new Error(message);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  /* ========================================
     UPDATE ADDRESS
  ======================================== */

  const updateAddress = useCallback(async (addressId, formData) => {
    try {
      setAddressLoading(true);

      const response = await api.put(`/address/update/${addressId}`, formData);

      if (response.data?.success) {
        /*
         * Supports:
         *
         * data: updatedAddress
         *
         * OR:
         *
         * data: {
         *   address: updatedAddress
         * }
         */

        const data = response.data?.data;

        const updatedAddress = data?.address || data;

        if (updatedAddress && typeof updatedAddress === 'object') {
          setAddresses((prev) =>
            prev.map((address) =>
              String(address._id) === String(addressId)
                ? updatedAddress
                : address,
            ),
          );

          /*
           * Also update selectedAddress
           * in case the drawer is still open.
           */

          setSelectedAddress(updatedAddress);
        }
      }

      return response.data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Address update failed';

      throw new Error(message);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  /* ========================================
     DELETE ADDRESS
  ======================================== */

  const deleteAddress = useCallback(async (addressId) => {
    try {
      setAddressLoading(true);

      const response = await api.delete(`/address/delete/${addressId}`);

      if (response.data?.success) {
        /*
         * IMPORTANT:
         *
         * Your old code had:
         *
         * address._id !== address
         *
         * That compares _id with the
         * complete address object.
         *
         * Correct:
         *
         * address._id !== addressId
         */

        setAddresses((prev) =>
          prev.filter((address) => String(address._id) !== String(addressId)),
        );

        /*
         * If deleted address was selected,
         * clear it.
         */

        setSelectedAddress((current) => {
          const currentId =
            current && typeof current === 'object' ? current._id : current;

          return currentId && String(currentId) === String(addressId)
            ? null
            : current;
        });
      }

      return response.data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Address deletion failed';

      throw new Error(message);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  /* ========================================
     CONTEXT VALUE
  ======================================== */

  const value = {
    /* Drawer */
    isOpenAddressBox,
    setIsOpenAddressBox,
    openAddressPanel,
    closeAddressPanel,

    /* Addresses */
    addresses,
    selectedAddress,
    setSelectedAddress,
    addressLoading,

    /* CRUD */
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
  };

  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
};

export default ThemeProvider;

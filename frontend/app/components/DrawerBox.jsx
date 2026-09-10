'use client';

import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

import { useContext, useEffect, useState } from 'react';

import { MyContext } from '@/app/context/MyContext';

import { IoMdClose } from 'react-icons/io';

import toast from 'react-hot-toast';

const initialForm = {
  name: '',
  phone: '',
  addressLine1: '',
  city: '',
  state: '',
  postalCode: '',
  landmark: '',
  addressType: 'Home',
};

const DrawerBox = () => {
  const {
    isOpenAddressBox,
    closeAddressPanel,
    selectedAddress,
    updateAddress,
    addAddress,
  } = useContext(MyContext);

  const [formData, setFormData] = useState(initialForm);

  const [loading, setLoading] = useState(false);

  const isEditMode = Boolean(selectedAddress?._id);

  /**
   * Populate form when editing.
   * Reset form when adding a new address.
   */
  useEffect(() => {
    if (isOpenAddressBox && selectedAddress) {
      setFormData({
        name: selectedAddress.name || '',

        phone: selectedAddress.phone || '',

        addressLine1: selectedAddress.addressLine1 || '',

        city: selectedAddress.city || '',

        state: selectedAddress.state || '',

        postalCode: selectedAddress.postalCode || '',

        landmark: selectedAddress.landmark || '',

        addressType: selectedAddress.addressType || 'Home',
      });

      return;
    }

    if (isOpenAddressBox && !selectedAddress) {
      setFormData({
        ...initialForm,
      });
    }
  }, [selectedAddress, isOpenAddressBox]);

  /**
   * Input change
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);

      setFormData((prev) => ({
        ...prev,
        phone: numericValue,
      }));

      return;
    }

    if (name === 'postalCode') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6);

      setFormData((prev) => ({
        ...prev,
        postalCode: numericValue,
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Basic validation
   */
  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return false;
    }

    if (!formData.phone.trim()) {
      toast.error('Please enter your phone number');
      return false;
    }

    if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
      toast.error('Please enter a valid 10 digit phone number');
      return false;
    }

    if (!formData.addressLine1.trim()) {
      toast.error('Please enter your address');
      return false;
    }

    if (!formData.city.trim()) {
      toast.error('Please enter your city');
      return false;
    }

    if (!formData.state.trim()) {
      toast.error('Please enter your state');
      return false;
    }

    if (!formData.postalCode.trim()) {
      toast.error('Please enter your postal code');
      return false;
    }

    if (!/^[0-9]{6}$/.test(formData.postalCode.trim())) {
      toast.error('Please enter a valid 6 digit postal code');
      return false;
    }

    return true;
  };

  /**
   * Submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      /**
       * Create a clean payload.
       */
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        addressLine1: formData.addressLine1.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        landmark: formData.landmark.trim(),
        addressType: formData.addressType,
      };

      let response;

      /**
       * UPDATE
       */
      if (isEditMode) {
        response = await updateAddress(selectedAddress._id, payload);

        toast.success('Address updated successfully');
      } else {
        /**
         * ADD
         */
        response = await addAddress(payload);

        toast.success('Address saved successfully');
      }

      /**
       * Close drawer only after
       * successful API operation.
       */
      closeAddressPanel();

      /**
       * Do NOT manually clear the form here.
       *
       * When the drawer is opened again
       * without selectedAddress, the
       * useEffect will reset it correctly.
       */
    } catch (error) {
      console.error('Address save/update error:', error);

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Unable to save address',
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Close handler
   */
  const handleClose = () => {
    if (loading) {
      return;
    }

    closeAddressPanel();
  };

  return (
    <Drawer open={isOpenAddressBox} onClose={handleClose} anchor="right">
      {/* =============================== */}
      {/* HEADER */}
      {/* =============================== */}

      <div className="flex items-center justify-between border-b border-gray-300 p-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">
            {isEditMode ? 'Update Delivery Address' : 'Add Delivery Address'}
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            {isEditMode
              ? 'Update your delivery details'
              : 'Enter your delivery details'}
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleClose}
          aria-label="Close"
        >
          <IoMdClose className="h-6 w-6" />
        </button>
      </div>

      {/* =============================== */}
      {/* FORM */}
      {/* =============================== */}

      <form onSubmit={handleSubmit} className="w-full p-5 sm:w-110 lg:w-120">
        <div className="mt-3 flex flex-col gap-4">
          {/* Name */}
          <TextField
            name="name"
            label="Name"
            variant="outlined"
            fullWidth
            value={formData.name}
            onChange={handleChange}
            required
          />

          {/* Phone */}
          <TextField
            name="phone"
            label="Phone No"
            variant="outlined"
            fullWidth
            value={formData.phone}
            onChange={handleChange}
            slotProps={{
              htmlInput: {
                maxLength: 10,
                inputMode: 'numeric',
              },
            }}
            required
          />

          {/* Address */}
          <TextField
            name="addressLine1"
            label="Address Line 1"
            variant="outlined"
            fullWidth
            value={formData.addressLine1}
            onChange={handleChange}
            multiline
            minRows={2}
            required
          />

          {/* City */}
          <TextField
            name="city"
            label="City"
            variant="outlined"
            fullWidth
            value={formData.city}
            onChange={handleChange}
            required
          />

          {/* State */}
          <TextField
            name="state"
            label="State"
            variant="outlined"
            fullWidth
            value={formData.state}
            onChange={handleChange}
            required
          />

          {/* Postal Code */}
          <TextField
            name="postalCode"
            label="Postal Code"
            variant="outlined"
            fullWidth
            value={formData.postalCode}
            onChange={handleChange}
            slotProps={{
              htmlInput: {
                maxLength: 6,
                inputMode: 'numeric',
              },
            }}
            required
          />

          {/* Landmark */}
          <TextField
            name="landmark"
            label="Landmark"
            variant="outlined"
            fullWidth
            value={formData.landmark}
            onChange={handleChange}
          />

          {/* Address Type */}
          <TextField
            select
            name="addressType"
            label="Address Type"
            variant="outlined"
            fullWidth
            value={formData.addressType}
            onChange={handleChange}
          >
            <MenuItem value="Home">Home</MenuItem>

            <MenuItem value="Office">Office</MenuItem>

            <MenuItem value="Other">Other</MenuItem>
          </TextField>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-full bg-yellow px-6 py-3 font-bold uppercase tracking-tight text-black transition-colors duration-500 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? 'Saving...'
              : isEditMode
                ? 'Update Address'
                : 'Save Address'}
          </button>
        </div>
      </form>
    </Drawer>
  );
};

export default DrawerBox;

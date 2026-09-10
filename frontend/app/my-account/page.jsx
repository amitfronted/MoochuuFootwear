'use client';

import React, { useEffect, useState } from 'react';
import { TextField } from '@mui/material';
import { FaRegSave } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';

const MyAccount = () => {
  const { user, updateProfile, loading, updatePassword } = useAuth();
  const [profile, setProfile] = useState({
    fullname: '',
    phone: '',
  });
  const [isOpenChangePassword, setIsOpenChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setProfile({
        fullname: user.name || '',
        phone: user.mobile || '',
      });
    }
  }, [user]);

  const handleOpenChangePasswordBox = () => {
    setIsOpenChangePassword((prev) => !prev);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { fullname, phone } = profile;

    if (!fullname?.trim() || !phone?.trim()) {
      toast.error('Please enter full name and phone number');
      return;
    }

    try {
      const response = await updateProfile(fullname, phone);

      if (response.success) {
        toast.success(response.message || 'Profile updated successfully');
      } else {
        toast.error(response.message || 'Profile not updated successfully');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    }
  };

  const handlePasswordform = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Please enter All fields Properly');
      return;
    }

    try {
      const response = await updatePassword(
        oldPassword,
        newPassword,
        confirmPassword,
      );
      if (response.success) {
        toast.success(response.message || 'Password Updated Successfully');
      } else {
        toast.error(response.message || 'Password Updated not Successfully');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    }

    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <div className="w-full rounded-md bg-white shadow-md">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-lg font-medium text-gray-700">My Profile</h4>

            <p className="text-sm text-gray-500">
              All your account information in one place
            </p>
          </div>
          {user?.signUpWithGoogle === false ? (
            <button
              type="button"
              onClick={handleOpenChangePasswordBox}
              className="cursor-pointer w-fit rounded-full bg-yellow px-6 py-2 text-sm font-bold uppercase text-black transition-colors hover:bg-black hover:text-white"
            >
              {isOpenChangePassword ? 'Close Password' : 'Change Password'}
            </button>
          ) : (
            ''
          )}
        </div>

        {/* Form */}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-5 p-4 md:grid-cols-2"
        >
          <TextField
            name="fullname"
            label="Full Name"
            value={profile.fullname}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            name="phone"
            label="Phone No"
            value={profile.phone}
            onChange={handleChange}
            fullWidth
          />

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-yellow px-4 py-2.5 w-45 items-center justify-center text-sm font-semibold text-black hover:bg-black hover:text-white rounded-full cursor-pointer flex gap-2"
            >
              <FaRegSave size={20} /> <span>Update Profile</span>
            </button>
          </div>
        </form>
      </div>

      <>
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isOpenChangePassword
              ? 'mt-6 max-h-150 translate-y-0 opacity-100'
              : 'mt-0 max-h-0 -translate-y-4 opacity-0'
          }`}
        >
          <div className="w-full rounded-md bg-white shadow-md">
            <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="text-lg font-medium text-gray-700">
                  Change Password
                </h4>

                <p className="text-sm text-gray-500">Update Your Password</p>
              </div>
            </div>

            {/* Form */}

            <form
              onSubmit={handlePasswordform}
              className="grid grid-cols-1 gap-5 p-4 md:grid-cols-2"
            >
              <TextField
                name="oldpassword"
                label="Old Password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                fullWidth
              />

              <TextField
                name="newpassword"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
              />

              <TextField
                name="confirmpassword"
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
              />

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="bg-yellow px-4 py-2.5 w-45 items-center justify-center text-sm font-semibold text-black hover:bg-black hover:text-white rounded-full cursor-pointer flex gap-2"
                >
                  <FaRegSave size={20} /> <span>Change Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    </>
  );
};

export default MyAccount;

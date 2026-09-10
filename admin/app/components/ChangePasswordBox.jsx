'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';
import { BsArrowLeft } from 'react-icons/bs';
import toast from 'react-hot-toast';

const ChangePasswordBox = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [isShowConfirmPassword, setIsShowConfirmPassword] = useState(false);

  const { loading, resetPassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const savedEmail = localStorage.getItem('forgotPasswordEmail');
    if (!savedEmail) {
      toast.error('Please start the password reset process');
      router.replace('/forgot-password');
      return;
    }
    setEmail(savedEmail);
  }, [router]);
  const handleShowPassword = () => {
    setIsShowPassword((prev) => !prev);
  };
  const handleConfirmShowPassword = () => {
    setIsShowConfirmPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email not found');
      router.replace('/forgot-password');
      return;
    }
    if (!password || !confirmPassword) {
      toast.error('Please fill all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      const response = await resetPassword(email, password, confirmPassword);
      if (response.success) {
        toast.success(response.message || 'Password reset successfully');
        // Clear temporary reset data
        localStorage.removeItem('forgotPasswordEmail');
        router.replace('/login');
      }
    } catch (error) {
      toast.error(error.message || 'Password reset failed');
    }
  };

  return (
    <div className="absolute top-0 left-[20%] z-100 w-[60%] h-fit py-25">
      <h1 className="text-center text-[40px] font-extrabold w-[70%] m-auto">
        Reset Password
      </h1>
      <img
        src="/reset-password.png"
        alt="reset password"
        className="mt-6 w-24 h-24 mx-auto"
      />
      <div className="flex flex-col items-center justify-center">
        <div className="max-w-md w-full">
          <form className="space-y-6 mt-6" onSubmit={handleSubmit}>
            <div className="relative">
              <label
                htmlFor="password"
                className="mb-2 text-slate-900 font-medium text-sm inline-block dark:text-slate-50"
              >
                Password
              </label>
              <input
                type={isShowPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="px-3 py-2.5 text-sm text-slate-900 rounded-md bg-white w-full outline-1 -outline-offset-1 outline-slate-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:text-slate-50 dark:bg-neutral-700 dark:outline-neutral-600"
              />
              <button
                type="button"
                onClick={handleShowPassword}
                className="absolute bottom-2 right-0 px-2 cursor-pointer"
              >
                {isShowPassword ? (
                  <FaRegEye className="w-4 h-4 text-gray-700" />
                ) : (
                  <FaRegEyeSlash className="w-4 h-4 text-gray-700" />
                )}
              </button>
            </div>
            <div className="relative">
              <label
                htmlFor="confirmPassword"
                className="mb-2 text-slate-900 font-medium text-sm inline-block dark:text-slate-50"
              >
                Confirm Password
              </label>
              <input
                type={isShowConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="px-3 py-2.5 text-sm text-slate-900 rounded-md bg-white w-full outline-1 -outline-offset-1 outline-slate-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:text-slate-50 dark:bg-neutral-700 dark:outline-neutral-600"
              />
              <button
                type="button"
                onClick={handleConfirmShowPassword}
                className="absolute top-5 right-4 cursor-pointer"
              >
                {isShowConfirmPassword ? (
                  <FaRegEye className="w-4 h-4 text-gray-700" />
                ) : (
                  <FaRegEyeSlash className="w-4 h-4 text-gray-700" />
                )}
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-3.5 text-sm rounded-md font-semibold cursor-pointer tracking-wide text-black hover:text-white border border-yellow bg-yellow hover:bg-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              {loading ? 'Submiting...' : 'Submit'}
            </button>

            <div className="text-slate-900 text-sm text-center dark:text-slate-50">
              <Link
                href="/"
                className="text-gray-700 hover:underline ml-1 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded inline-flex items-center justify-center"
              >
                <BsArrowLeft size={20} className="mr-2" /> Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordBox;

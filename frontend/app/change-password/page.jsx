'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HiOutlineLogin } from 'react-icons/hi';
import Image from 'next/image';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ChangePassword = () => {
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
    <section className="py-10 w-full h-screen bg-gray-100 flex items-center justify-center">
      <div className="absolute inset-0 bg-[url('/patern.webp')] bg-cover bg-center opacity-5"></div>
      <div className="container">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-md md:max-w-lg md:min-w-lg md:w-lg w-full m-auto relative z-10">
          <Image
            src="/reset-password.png"
            width={100}
            height={100}
            className="mx-auto mt-4"
            alt="reset password"
            loading="eager"
          />
          <h2 className="text-center text-xl font-medium text-gray-700 my-4">
            Reset Password
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="my-3 relative">
              <input
                type={isShowPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                disabled={loading}
                className="border border-gray-200 w-full rounded-md p-3 focus:outline-amber-200"
              />
              <button
                type="button"
                onClick={handleShowPassword}
                className="absolute top-5 right-4 cursor-pointer"
              >
                {isShowPassword ? (
                  <FaRegEye className="w-4 h-4 text-gray-700" />
                ) : (
                  <FaRegEyeSlash className="w-4 h-4 text-gray-700" />
                )}
              </button>
            </div>
            <div className="my-3 relative">
              <input
                type={isShowConfirmPassword ? 'text' : 'password'}
                id="confirmpassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
                disabled={loading}
                className="border border-gray-200 w-full rounded-md p-3 focus:outline-amber-200"
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

            <div className="my-3">
              <button
                type="submit"
                disabled={loading}
                className={`w-full uppercase tracking-tight px-6 py-4 font-bold text-black rounded-full flex items-center justify-center transition-colors duration-700 bg-yellow hover:bg-black hover:text-white cursor-pointer`}
              >
                {loading ? 'Submiting...' : 'Submit'}
              </button>
            </div>
            <div className="text-center text-[15px] text-gray-700 mb-3">
              <Link
                href={'/login'}
                className="text-gray-700 hover:text-amber-500 font-bold pl-2 text-center flex items-center justify-center"
              >
                <HiOutlineLogin className="w-5 h-5 mr-2 group-hover:text-amber-500" />{' '}
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ChangePassword;

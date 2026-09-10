'use client';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { HiOutlineLogin } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const { loading, forgotPassword } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    try {
      const response = await forgotPassword(email);
      if (response.success) {
        localStorage.setItem('forgotPasswordEmail', email);
        toast.success(response.message || 'OTP has been sent to your mail');
        router.push('/verify-forgot-password');
      } else {
        toast.error(response.message || 'Otp not send');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'something went wrong');
    }
  };

  return (
    <section className="py-10 w-full h-screen bg-gray-100 flex items-center justify-center">
      <div className="absolute inset-0 bg-[url('/patern.webp')] bg-cover bg-center opacity-5"></div>
      <div className="container">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-md md:max-w-lg md:min-w-lg md:w-lg w-full m-auto relative z-10">
          <Image
            src="/forgot-password.png"
            width={100}
            height={100}
            className="mx-auto mt-4"
            alt="forgot password"
            loading="eager"
          />
          <h2 className="text-center text-xl font-medium text-gray-700 my-4">
            Forgot Password
          </h2>
          <p className="text-center text-sm text-gray-500 mb-5">
            Enter your email address and we will send you an OTP.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="my-3">
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Id"
                disabled={loading}
                className="border border-gray-200 w-full rounded-md p-3 focus:outline-amber-200"
              />
            </div>

            <div className="my-3">
              <button
                type="submit"
                disabled={loading}
                className={`w-full uppercase tracking-tight px-6 py-4 font-bold text-black rounded-full flex items-center justify-center transition-colors duration-700 bg-yellow hover:bg-black hover:text-white cursor-pointer`}
              >
                {loading ? 'Sending OTP...' : 'Submit'}
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

export default ForgotPassword;

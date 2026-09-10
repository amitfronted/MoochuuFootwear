'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { BsArrowLeft } from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const ForgotPasswordBox = () => {
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
        toast.success(response.message || 'OTP has been sent to your email');
        router.push('/verify-forgot-password');
      } else {
        toast.error(response.message || 'OTP not send');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'something went wrong');
    }
  };

  return (
    <div className="absolute top-0 left-[20%] z-100 w-[60%] h-fit py-25">
      <img
        src="/forgot-password.png"
        alt="reset password"
        className="mt-6 w-24 h-24 mx-auto"
      />
      <h1 className="text-center text-[40px] font-extrabold w-[70%] m-auto">
        Forgot Password
      </h1>

      <div className="flex flex-col items-center justify-center">
        <div className="max-w-md w-full">
          <form className="space-y-6 mt-6">
            <div>
              <label
                htmlFor="email"
                className="mb-2 text-slate-900 font-medium text-sm inline-block dark:text-slate-50"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="amit@gmail.com"
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-2.5 text-sm text-slate-900 rounded-md bg-white w-full outline-1 -outline-offset-1 outline-amber-100 focus:outline-2 focus:-outline-offset-2 focus:outline-ambar-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-3.5 text-sm rounded-md font-semibold cursor-pointer tracking-wide text-black hover:text-white border border-yellow bg-yellow hover:bg-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              {loading ? 'Sending OTP...' : 'Submit'}
            </button>

            <div className="text-slate-900 text-sm text-center">
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

export default ForgotPasswordBox;

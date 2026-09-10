'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineLogin } from 'react-icons/hi';
import OtpBox from '../components/OtpBox';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const VerifyForgotPassword = () => {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');

  const { verifyForgotPasswordOtp, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    const savedEmail = localStorage.getItem('forgotPasswordEmail');
    if (!savedEmail) {
      toast.error('Email not found. Please try again');
      router.replace('/forgot-password');
      return;
    }
    setEmail(savedEmail);
  }, [router]);
  const handleChangeOtp = (value) => {
    setOtp(value);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email not found');
      router.replace('/forgot-password');
      return;
    }

    if (otp.length !== 6) {
      toast.error('Please enter a valid 6 digit OTP');
      return;
    }
    try {
      const response = await verifyForgotPasswordOtp(email, otp);
      if (response.success) {
        toast.success('OTP verified successfully');

        router.push('/change-password');
      }
    } catch (error) {
      toast.error(error.message || 'OTP verification failed');
    }
  };
  return (
    <section className="py-10 w-full h-screen bg-gray-100 flex items-center justify-center">
      <div className="container">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-md md:max-w-lg md:min-w-lg md:w-lg w-full m-auto">
          <Image
            src="/verify.png"
            width={80}
            height={80}
            className="mx-auto mt-4"
            alt="forgot password"
            loading="eager"
          />
          <h2 className="text-center text-xl font-medium text-gray-700 my-3">
            Verify forgot password
          </h2>
          <p className="text-center font-medium">
            Otp sent to{' '}
            <span className=" text-amber-500 font-semibold">{email}</span>
          </p>
          <form onSubmit={handleSubmit}>
            <div className="my-3 flex items-center justify-center">
              <OtpBox length={6} onChange={handleChangeOtp} />
            </div>
            <div className="my-3">
              <button
                type="submit"
                disabled={loading}
                className={`w-full uppercase tracking-tight px-6 py-4 font-bold text-black rounded-full flex items-center justify-center transition-colors duration-700 bg-yellow hover:bg-black hover:text-white cursor-pointer`}
              >
                {loading ? 'Verifying...' : 'Verify'}
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

export default VerifyForgotPassword;

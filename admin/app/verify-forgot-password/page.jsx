'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { HiOutlineLogin } from 'react-icons/hi';
import OtpBox from '../components/OtpBox';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import OuterHeader from '../components/OuterHeader';

const VerifyForgotPassword = () => {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');

  const { loading, verifyForgotPasswordOtp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const savedEmail = localStorage.getItem('forgotPasswordEmail');
    if (!savedEmail) {
      toast.error('Email not Found. Please try Again');
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

    if (otp.length === 6) {
      toast.error('Please enter a valid 6 digit OTP');
      return;
    }

    try {
      const response = await verifyForgotPasswordOtp(email, otp);
      if (response.success) {
        toast.success('OTP Verified Successfully');
        router.push('/change-password');
      }
    } catch (error) {
      toast.error(error.message || 'OTP verification failed');
    }
  };
  return (
    <>
      <OuterHeader />

      <div className="absolute top-0 left-[20%] z-100 w-[60%] h-fit py-25">
        <img
          src="/forgot-password.png"
          alt="reset password"
          className="mt-6 w-24 h-24 mx-auto"
        />
        <h1 className="text-center text-[40px] font-extrabold w-[70%] m-auto">
          Verify Forgot Password
        </h1>

        <p className="text-center font-medium py-3.5">
          Otp sent to{' '}
          <span className=" text-amber-500 font-semibold">{email}</span>
        </p>
        <div className="flex flex-col items-center justify-center">
          <div className="max-w-md w-full">
            <form onSubmit={handleSubmit}>
              <div className="my-3 flex items-center justify-center">
                <OtpBox length={6} onChange={handleChangeOtp} />
              </div>
              <div className="my-6">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2 px-3.5 text-sm rounded-md font-semibold cursor-pointer tracking-wide text-black hover:text-white border border-yellow bg-yellow hover:bg-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              <div className="text-center text-[15px] text-gray-700 mb-3">
                <Link
                  href={'/'}
                  className="text-gray-700 hover:text-amber-500 font-medium pl-2 text-center flex items-center justify-center"
                >
                  <HiOutlineLogin className="w-5 h-5 mr-2 group-hover:text-amber-500" />{' '}
                  Back to login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyForgotPassword;

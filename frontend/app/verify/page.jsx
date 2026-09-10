'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineLogin } from 'react-icons/hi';
import OtpBox from '../components/OtpBox';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { formatTime } from '@/utilis/formatTime';

const VerifyOtp = () => {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [countDown, setCountDown] = useState(600);
  const [isMounted, setIsMounted] = useState(false);

  const { verifyEmail, loading, resendOtp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const savedEmail = localStorage.getItem('verifyEmail');

    if (!savedEmail) {
      toast.error('Email not found. Please register again.');
      router.push('/register');
      return;
    }

    setEmail(savedEmail);
  }, [router]);

  useEffect(() => {
    if (countDown <= 0) return;

    const timer = setInterval(() => {
      setCountDown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countDown]);

  const handleChangeOtp = (value) => {
    setOtp(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    if (!email) {
      toast.error('Email not found. Please register again.');
      router.push('/register');
      return;
    }

    try {
      const res = await verifyEmail(email, otp);

      if (res.success) {
        toast.success(res.message || 'Email verified successfully');
        localStorage.removeItem('verifyEmail');
        router.push('/login');
      } else {
        toast.error(res.message || 'OTP verification failed');
      }
    } catch (error) {
      console.error('Verify OTP Error:', error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'OTP verification failed',
      );
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      toast.error('Email not found. Please register again.');
      router.push('/register');
      return;
    }

    if (countDown > 0) return;

    try {
      setResendLoading(true);
      const res = await resendOtp(email);

      if (res.success) {
        toast.success(res.message || 'OTP resent successfully!');
        setOtp('');
        setCountDown(600); // Reset timer to 10 minutes
      } else {
        toast.error(res.message || 'Failed to resend OTP.');
      }
    } catch (error) {
      console.error('Resend OTP Error:', error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Failed to resend OTP.',
      );
    } finally {
      setResendLoading(false);
    }
  };

  if (!isMounted) return null;

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
          />
          <h2 className="text-center text-xl font-medium text-gray-700 my-3">
            Verify Email Address
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
            {/* Resend OTP */}
            <div className="text-center my-5">
              <p className="text-sm text-gray-600">
                Didn&apos;t receive the OTP?
              </p>

              {countDown > 0 ? (
                <p className="mt-1 text-sm text-gray-500">
                  Resend OTP in{' '}
                  <span className="font-semibold text-amber-600">
                    {formatTime ? formatTime(countDown) : `${countDown}s`}
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  className="mt-1 text-sm text-amber-600 font-semibold hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {resendLoading ? 'Sending...' : 'Resend OTP'}
                </button>
              )}
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

export default VerifyOtp;

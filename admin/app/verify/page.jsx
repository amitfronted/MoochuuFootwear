'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { HiOutlineLogin } from 'react-icons/hi';
import OtpBox from '../components/OtpBox';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatTime } from '../utilis/formatTime';
import OuterHeader from '../components/OuterHeader';

const Verify = () => {
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
      toast.error('Email not Found. Please register Again!');
      router.push('/register');
      return;
    }
    setEmail(savedEmail);
  }, [router]);

  useEffect(() => {
    if (countDown < 0) return;

    const timer = setInterval(() => {
      setCountDown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChangeOtp = (value) => {
    setOtp(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-Digit OTP');
      return;
    }
    if (!email) {
      toast.error('Email not Found. Please Register Again!');
      router.push('/register');
      return;
    }
    try {
      const res = await verifyEmail(email, otp);
      if (res.success) {
        toast.success(res.message || 'Email Verified Successfully');
        localStorage.removeItem('VerifyEmail');
        router.push('/');
      } else {
        toast.error(res.message || 'OTP Verification Failed');
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'OTP verification failed',
      );
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      toast.error('Email not Found. Please Register Again!');
      router.push('/register');
      return;
    }
    if (countDown > 0) return;
    try {
      setResendLoading(true);
      const res = await resendOtp(email);
      if (res.success) {
        toast.success(res.success || 'OTP Send Successfully!');
        setOtp('');
        setCountDown(600); //Reset timer to 10 minutes
      } else {
        toast.error(res.message || 'Failed to resend OTP');
      }
    } catch (error) {
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
    <>
      <OuterHeader />
      <div className="absolute top-0 left-[20%] z-100 w-[60%] h-fit py-25">
        <img
          src="/forgot-password.png"
          alt="reset password"
          className="mt-6 w-24 h-24 mx-auto"
        />
        <h1 className="text-center text-[40px] font-extrabold w-[70%] m-auto">
          Verify Account
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
                  {loading ? 'Verifying...' : 'verify'}
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

export default Verify;

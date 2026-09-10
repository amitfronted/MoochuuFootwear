'use client';
import React, { useState } from 'react';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import GoogleLoginButton from '../components/GoogleLoginButton';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isShowPassword, setIsShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const handleShowPassword = () => {
    setIsShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    try {
      const response = await login(email, password);
      if (response.success) {
        toast.success(response.message || 'Login Successfully');
        router.replace(redirect);
      } else {
        toast.error(response.message || 'Login Failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'something went wrong');
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <section className="py-10 w-full h-screen bg-gray-100 flex items-center justify-center">
      <div className="absolute inset-0 bg-[url('/patern.webp')] bg-cover bg-center opacity-5"></div>
      <div className="container">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-md md:max-w-lg md:min-w-lg md:w-lg w-full m-auto relative z-10">
          <h2 className="text-center text-xl font-medium text-gray-700 mb-6">
            Login to your account
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="my-3">
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Id"
                className="border border-gray-200 w-full rounded-md p-3 focus:outline-amber-200"
              />
            </div>
            <div className="my-3 relative">
              <input
                type={isShowPassword ? 'text' : 'password'}
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <div className="pb-3">
              <Link
                href={'/forgot-password'}
                className="font-medium text-gray-600 hover:text-black"
              >
                Forgot Password
              </Link>
            </div>

            <div className="my-3">
              <button
                type="submit"
                disabled={loading}
                className={`w-full uppercase tracking-tight px-6 py-4 font-bold text-black rounded-full flex items-center justify-center transition-colors duration-700 bg-yellow hover:bg-black hover:text-white cursor-pointer`}
              >
                {loading === 'true' ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
          <div className="text-center text-[15px] text-gray-700 mb-3">
            <span>
              Not Register?{' '}
              <Link href={'/register'} className="text-yellow-900 font-bold">
                Sign Up
              </Link>
            </span>
          </div>
          <div className="text-center text-[15px] text-gray-700 mb-3">
            or Continue with Social account
          </div>
          <div className="my-3 flex w-3/4 items-center justify-center m-auto">
            <div className="googleLogin">
              <GoogleLoginButton />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;

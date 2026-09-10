'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';

const LoginBox = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isShowPassword, setIsShowPassword] = useState(false);

  const { loading, login } = useAuth();
  const router = useRouter();

  const handleShowPassword = () => {
    setIsShowPassword((prev) => !prev);
  };

  const redirectByRole = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        router.replace('/dashboard');
        break;

      case 'USER':
        window.open(
          process.env.NEXT_PUBLIC_FRONTEND_URL,
          '_blank',
          'noopener,noreferrer',
        );

        router.replace('/');
        break;

      default:
        toast.error('You are not authorized to access the admin panel');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill the email and paassword');
      return;
    }
    try {
      const response = await login(email, password);

      if (response.success) {
        toast.success('Login Successfully');
        redirectByRole(response.data.user.role);
      } else {
        toast.error('Login Failed');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    }
  };

  return (
    <div className="absolute top-0 left-[20%] z-100 w-[60%] h-fit py-25">
      <h1 className="text-center text-[40px] font-extrabold w-[70%] m-auto">
        Welcome Back! Sign in with your credentials.
      </h1>

      <div className="flex flex-col items-center justify-center">
        <div className="max-w-md w-full">
          <form className="space-y-6 mt-10" onSubmit={handleSubmit}>
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
                placeholder="john@readymadeui.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-2.5 text-sm text-slate-900 rounded-md bg-white w-full outline-1 -outline-offset-1 outline-slate-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:text-slate-50 dark:bg-neutral-700 dark:outline-neutral-600"
              />
            </div>
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-3 py-2.5 text-sm text-slate-900 rounded-md bg-white w-full outline-1 -outline-offset-1 outline-slate-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:text-slate-50 dark:bg-neutral-700 dark:outline-neutral-600"
              />
              <button
                type="button"
                onClick={handleShowPassword}
                className="absolute bottom-0 right-0 px-3 cursor-pointer py-3"
              >
                {isShowPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
              </button>
            </div>

            <div className="flex items-start flex-wrap gap-2">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-gray-700 dark:text-gray-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-3.5 text-sm rounded-md font-semibold cursor-pointer tracking-wide text-black hover:text-white border border-yellow bg-yellow hover:bg-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              {loading ? 'Sign ining...' : 'Sign in'}
            </button>

            <div className="text-slate-900 text-sm text-center dark:text-slate-50">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="text-gray-700 hover:underline ml-1 font-medium dark:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
              >
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginBox;

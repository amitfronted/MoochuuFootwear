'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const RegisterBox = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isShowPassword, setIsShowPassword] = useState(false);
  const { loading, register } = useAuth();
  const router = useRouter();

  const handleShowPassword = () => {
    setIsShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const res = await register(name, email, password);

      if (res.success) {
        toast.success(res.message || 'Registration successful');

        localStorage.setItem('verifyEmail', email);

        router.push('/verify');
      } else {
        toast.error(res.message || 'Registration failed');
      }
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    }
    setEmail('');
    setName('');
    setPassword('');
  };

  return (
    <div className="absolute top-0 left-[20%] z-100 w-[60%] h-fit py-25">
      <h1 className="text-center text-[40px] font-extrabold w-[70%] m-auto">
        Join us today! Get special benefits and stay up-to-date.
      </h1>

      <div className="flex flex-col items-center justify-center">
        <div className="max-w-md w-full">
          <form onSubmit={handleSubmit} className="space-y-6 mt-10">
            <div>
              <label
                htmlFor="name"
                className="mb-2 text-slate-900 font-medium text-sm inline-block dark:text-slate-50"
              >
                Username
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="amit"
                className="px-3 py-2.5 text-sm text-slate-900 rounded-md bg-white w-full outline-1 -outline-offset-1 outline-slate-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:text-slate-50 dark:bg-neutral-700 dark:outline-neutral-600"
              />
            </div>
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

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-3.5 text-sm rounded-md font-semibold
                tracking-wide border border-yellow transition-all
                ${
                  loading
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer text-black hover:text-white bg-yellow hover:bg-black'
                }
              `}
            >
              {loading ? 'Creating...' : 'Create an account'}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 text-slate-900 text-sm text-center dark:text-slate-50">
        Already have an account?{' '}
        <Link
          href="/"
          className="text-gray-700 hover:underline ml-1 font-medium dark:text-white-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 rounded"
        >
          Login here
        </Link>
      </div>
    </div>
  );
};

export default RegisterBox;

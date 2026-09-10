'use client';
import Link from 'next/link';
import { useState } from 'react';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const Register = () => {
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [fullname, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { register, loading } = useAuth();
  const router = useRouter();

  const handleShowPassword = () => {
    setIsShowPassword((prev) => !prev);
  };
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullname || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      const res = await register(fullname, email, password);

      if (res.success) {
        toast.success(res.message || 'Registration successful');
        // Save email for verification page
        localStorage.setItem('verifyEmail', email);
        router.push('/verify');
      }
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    }
  };
  return (
    <section className="py-10 w-full h-screen bg-gray-100 flex items-center justify-center">
      <div className="absolute inset-0 bg-[url('/patern.webp')] bg-cover bg-center opacity-5"></div>
      <div className="container">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-md md:max-w-lg md:min-w-lg md:w-lg w-full m-auto relative z-10">
          <h2 className="text-center text-xl font-medium text-gray-700 mb-6">
            Register with a new account
          </h2>
          <form onSubmit={handleRegister}>
            <div className="my-3">
              <input
                type="text"
                id="fullname"
                placeholder="Full Name"
                value={fullname}
                onChange={(e) => setFullName(e.target.value)}
                className="border border-gray-200 p-3 w-full rounded-md focus:outline-amber-200"
              />
            </div>
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

            <div className="my-3">
              <button
                type="submit"
                disabled={loading}
                className={`w-full uppercase tracking-tight px-6 py-4 font-bold text-black rounded-full flex items-center justify-center transition-colors duration-700 bg-yellow hover:text-white hover:bg-black cursor-pointer`}
              >
                {loading ? 'Registering...' : 'Register'}
              </button>
            </div>
          </form>
          <div className="text-center text-[15px] text-gray-700 mb-3">
            <span>
              Already have an Account. Please{' '}
              <Link href={'/login'} className="text-yellow-900 font-bold">
                Login
              </Link>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Register;

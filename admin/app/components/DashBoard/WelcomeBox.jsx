'use client';
import { MdWavingHand } from 'react-icons/md';
import { FiPlus } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

const WelcomeBox = () => {
  const { user } = useAuth();
  return (
    <div className="w-full border border-blue-300 rounded-xl mt-4">
      <div className="flex gap-2">
        <div className="flex-7/12 gap-2 p-4">
          <h2 className="pt-8 flex flex-col gap-2 text-4xl font-bold text-slate-900 dark:text-slate-50 pb-4">
            Welcome{' '}
            <span className="text-xl font-bold flex gap-2 items-center">
              {user.name} <MdWavingHand className="text-yellow-400 w-6 h-6" />
            </span>
          </h2>
          <p className="font-normal mb-4">
            Here's what's happening with your account today. See the latest
            updates <br />
            and insights to stay informed and make the most of <br />
            your experience.
          </p>
          <Link
            href="/dashboard/products/add-product"
            className="flex gap-2 items-center bg-yellow text-black font-medium px-4 py-2 rounded-md hover:bg-black hover:text-white transition-colors cursor-pointer w-40"
          >
            <FiPlus /> Add Product
          </Link>
        </div>
        <div className="flex-5/12">
          <div className="w-full relative">
            <div className="relative right-0 w-full h-full flex items-center justify-center">
              <img
                src="/ecommerce-png-png.png"
                alt="Dashboard illustration"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBox;

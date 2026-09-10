import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

const Logo = () => {
  return (
    <Link
      href="/"
      className="min-h-9 flex items-center justify-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
    >
      <Image
        src="/logo.png"
        alt="logo"
        width={80}
        height={80}
        loading="eager"
        className="w-10 h-10 block object-contain"
      />
      <span className="font-semibold text-slate-900 dark:text-slate-100 max-sm:hidden">
        Admin Dashboard
      </span>
    </Link>
  );
};

export default Logo;

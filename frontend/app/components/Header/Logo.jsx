import Image from 'next/image';
import Link from 'next/link';

const Logo = () => {
  return (
    <Link
      href="/"
      className="text-black flex gap-2 items-center justify-center"
    >
      <Image src="/logo.png" alt="logo" width={40} height={40} />
      <h3 className="uppercase font-extrabold md:text-4xl text-2xl tracking-tight">
        Moo chuu
      </h3>
    </Link>
  );
};

export default Logo;

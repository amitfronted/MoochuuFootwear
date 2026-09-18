import Link from 'next/link';

const Navbar = () => {
  const links = [
    {
      name: 'Home',
      href: '/',
    },
    {
      name: 'Shop',
      href: '/shop',
    },
    {
      name: 'About',
      href: '/about',
    },
  ];

  return (
    <nav>
      <ul className="hidden md:flex md:gap-3 lg:gap-8 text-black font-semibold uppercase">
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.href}
              className="relative inline-block after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:-bottom-1 after:h-0.5 after:w-0 after:bg-black after:transition-all after:duration-500 hover:after:w-full"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;

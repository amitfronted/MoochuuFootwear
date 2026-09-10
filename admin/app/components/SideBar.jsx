'use client';
import React from 'react';
import Logo from './Logo';
import Link from 'next/link';
import { CiUser } from 'react-icons/ci';
import {
  MdOutlineDashboard,
  MdKeyboardArrowDown,
  MdOutlineShoppingBag,
  MdOutlineInventory2,
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { AiOutlineProduct } from 'react-icons/ai';

const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <MdOutlineDashboard size={20} />,
    href: '/dashboard',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: <MdOutlineShoppingBag size={20} />,
    href: '/dashboard/orders',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'users',
    label: 'Users',
    icon: <CiUser size={20} />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
    subItems: [
      {
        label: 'All User',
        href: '/dashboard/users',
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
    ],
    defaultOpen: true,
  },
  {
    id: 'products',
    label: 'Products',
    icon: <AiOutlineProduct size={20} />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
    subItems: [
      {
        label: 'products',
        href: '/dashboard/products',
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
      {
        label: 'Add Products',
        href: '/dashboard/products/add-product',
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
    ],
  },
  {
    id: 'stock',
    label: 'Stock',
    icon: <MdOutlineInventory2 size={20} />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
    subItems: [
      {
        id: 'stock-list',
        label: 'Customize Stock List',
        href: '/dashboard/stock',
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
      {
        id: 'standard-stock-list',
        label: 'Standard Stock List',
        href: '/dashboard/standard-stock',
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
      {
        id: 'stock-history',
        label: 'Stock History',
        href: '/dashboard/stock/history',
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
    ],
  },
  {
    id: 'Components',
    label: 'Components',
    icon: <AiOutlineProduct size={20} />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
    subItems: [
      {
        label: 'Base / Sole',
        href: '/dashboard/components/base',
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
      {
        label: 'Strap',
        href: '/dashboard/components/strap',
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
      {
        label: 'Thumb',
        href: '/dashboard/components/thumb',
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
      {
        label: 'Add Components',
        href: '/dashboard/components/add-component',
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
    ],
  },
];

const SideBar = ({ isSidebarOpen, openSubMenus, toggleSubMenu }) => {
  const { user } = useAuth();

  const userRole = user?.role;
  const visibleNavigationItems = NAVIGATION_ITEMS.map((item) => {
    // Filter submenu items according to role
    if (item.subItems) {
      const visibleSubItems = item.subItems.filter((subItem) =>
        subItem.roles?.includes(userRole),
      );

      // Don't show parent if it has no accessible children
      if (visibleSubItems.length === 0) {
        return null;
      }

      return {
        ...item,
        subItems: visibleSubItems,
      };
    }

    // Normal menu item
    if (item.roles && !item.roles.includes(userRole)) {
      return null;
    }

    return item;
  }).filter(Boolean);
  return (
    <aside
      id="sidebar"
      className={`${
        isSidebarOpen ? 'w-66 min-w-66 opacity-100' : 'w-0 min-w-0 opacity-0'
      } overflow-hidden transition-all duration-300 ease-in-out`}
      aria-label="Sidebar navigation"
    >
      <div className="fixed top-0 left-0 w-66 h-full flex flex-col overflow-auto py-6 px-4 bg-white dark:bg-neutral-900 border-r border-slate-300 dark:border-neutral-700">
        <div className="mb-8">
          <Logo />
        </div>

        <nav className="flex-1" aria-label="Primary sidebar navigation">
          {visibleNavigationItems.map((item) => {
            const hasSubMenu =
              Array.isArray(item.subItems) && item.subItems.length > 0;

            return (
              <div key={item.id} className="mb-1">
                {hasSubMenu ? (
                  // =========================
                  // MENU WITH SUB MENU
                  // =========================
                  <>
                    <button
                      type="button"
                      onClick={() => toggleSubMenu(item.id)}
                      aria-expanded={openSubMenus[item.id]}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-neutral-800 dark:hover:text-slate-50"
                    >
                      {item.icon}

                      <span className="flex-1">{item.label}</span>
                      <MdKeyboardArrowDown
                        size={20}
                        className={`transition-transform duration-200 ${
                          !openSubMenus[item.id] ? '-rotate-90' : ''
                        }`}
                      />
                    </button>

                    {/* Sub Menu */}
                    <ul
                      className="space-y-1 overflow-hidden px-3 text-sm font-medium text-slate-600 transition-all duration-300 dark:text-slate-400"
                      style={{
                        maxHeight: openSubMenus[item.id] ? '500px' : '0px',
                        marginTop: openSubMenus[item.id] ? '4px' : '0px',
                      }}
                    >
                      {item.subItems.map((sub) => (
                        <li key={sub.label}>
                          <Link
                            href={sub.href}
                            className="block rounded-md px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-neutral-800 dark:hover:text-slate-50"
                          >
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  // =========================
                  // MENU WITHOUT SUB MENU
                  // =========================
                  <Link
                    href={item.href || '#'}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-neutral-800 dark:hover:text-slate-50"
                  >
                    {item.icon}

                    <span className="flex-1">{item.label}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        <Link
          href="#"
          className="flex flex-wrap items-center gap-4 rounded-md mt-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <img
            src="/man.png"
            className="w-10 h-10 rounded-md border border-slate-300 dark:border-neutral-700"
            alt="User avatar"
          />
          <div>
            <p className="text-sm text-slate-800 dark:text-slate-400 font-medium">
              {user.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{user.status}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default SideBar;

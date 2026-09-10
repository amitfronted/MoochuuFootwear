import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { CiMenuKebab, CiEdit } from 'react-icons/ci';

const MenuButton = ({ onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const handleOpenMenu = () => {
    setIsOpen((prev) => !prev);
  };
  useEffect(() => {
    const handleOutSideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutSideClick);
    return () => document.removeEventListener('mousedown', handleOutSideClick);
  }, []);
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleOpenMenu}
        className="cursor-pointer w-12 h-12 min-w-12 rounded-full p-0 text-gray-700 hover:bg-gray-200 flex items-center justify-center"
      >
        <CiMenuKebab size={20} />
      </button>
      <ul
        className={`border border-gray-100/60 rounded-sm overflow-hidden transition-all duration-500 ease-in-out absolute top-2.5 right-0 bg-white w-45 flex flex-col ${
          isOpen
            ? 'mt-8 max-h-150 translate-y-0 opacity-100'
            : 'mt-0 max-h-0 -translate-y-4 opacity-0'
        }`}
      >
        <li className="border-b border-gray-200">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 flex w-full cursor-pointer gap-2 items-center justify-start text-gray-700 hover:bg-amber-300 font-semibold"
          >
            <CiEdit size={20} /> Edit
          </button>
        </li>
        <li className="border-b border-gray-200">
          <button
            type="button"
            onClick={onDelete}
            className="p-1 flex w-full cursor-pointer gap-2 items-center justify-start text-gray-700 hover:bg-amber-300 font-semibold"
          >
            <CiEdit size={20} /> Delete
          </button>
        </li>
      </ul>
    </div>
  );
};

export default MenuButton;

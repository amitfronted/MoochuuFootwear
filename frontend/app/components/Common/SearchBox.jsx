import React from 'react';
import { CiSearch } from 'react-icons/ci';

const SearchBox = () => {
  return (
    <div className="w-full relative">
      <input
        type="text"
        placeholder="Search"
        className="w-full px-3 py-3 border border-gray-300 rounded-md hover:outline-amber-200 visited:outline-amber-200 focus:outline-amber-200"
      />
      <button className="absolute h-full cursor-pointer top-0 right-0 p-3 flex items-center justify-center">
        <CiSearch size={20} />
      </button>
    </div>
  );
};

export default SearchBox;

import React from 'react';

const EmptyAddressBox = ({ openAddressPanel }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <span className="text-2xl">📍</span>
      </div>

      <h3 className="text-lg font-semibold text-gray-700">No Address Found</h3>

      <p className="mt-1 text-sm text-gray-500">
        You haven't added a delivery address yet.
      </p>

      <button
        type="button"
        onClick={() => openAddressPanel()}
        className="mt-5 cursor-pointer rounded-full bg-yellow px-6 py-2 font-bold text-black transition-colors hover:bg-black hover:text-white"
      >
        Add Your First Address
      </button>
    </div>
  );
};

export default EmptyAddressBox;

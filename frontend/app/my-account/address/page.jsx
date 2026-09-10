'use client';
import AddressBox from '@/app/components/AddressBox';
import EmptyAddressBox from '@/app/components/EmptyAddressBox';
import Loader from '@/app/components/Loader';
import { MyContext } from '@/app/context/MyContext';
import { useContext, useEffect } from 'react';

const AddressPage = () => {
  const { openAddressPanel, addresses, getAddresses, addressLoading } =
    useContext(MyContext);
  useEffect(() => {
    getAddresses();
  }, [getAddresses]);
  return (
    <div className="w-full rounded-md bg-white shadow-md md:w-3/4">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-lg font-medium text-gray-700">Address</h4>

          <p className="text-sm text-gray-500">Manage Your Address</p>
        </div>
        {addresses.length < 3 && (
          <button
            type="button"
            onClick={() => openAddressPanel()}
            className="cursor-pointer w-fit rounded-full bg-yellow px-6 py-2 text-sm font-bold uppercase text-black transition-colors hover:bg-black hover:text-white"
          >
            Add Address
          </button>
        )}
      </div>
      <div className="p-4">
        {addressLoading && addresses.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            <Loader />
          </div>
        ) : addresses.length === 0 ? (
          <EmptyAddressBox openAddressPanel={openAddressPanel} />
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <AddressBox key={address._id} address={address} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressPage;

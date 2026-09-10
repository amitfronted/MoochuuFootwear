import React, { useContext } from 'react';
import MenuButton from '@/app/components/Buttons/MenuButton';
import { MyContext } from '../context/MyContext';
import toast from 'react-hot-toast';

const AddressBox = ({ address }) => {
  const { openAddressPanel, deleteAddress } = useContext(MyContext);
  const handleDelete = () => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="font-medium">
            Are you sure you want to delete this address?
          </p>

          <div className="flex gap-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id);

                try {
                  const response = await deleteAddress(address._id);

                  if (response?.success) {
                    toast.success(
                      response.message || 'Address deleted successfully',
                    );
                  }
                } catch (error) {
                  toast.error(
                    error?.response?.data?.message ||
                      'Failed to delete address',
                  );
                }
              }}
              className="rounded bg-red-500 px-3 py-1 text-sm text-white"
            >
              Delete
            </button>

            <button
              onClick={() => toast.dismiss(t.id)}
              className="rounded bg-gray-200 px-3 py-1 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
      },
    );
  };
  return (
    <div className="p-6 bg-amber-100 w-full rouded-lg flex items-start justify-between mb-4">
      <div className="relative">
        <span className="bg-amber-300 text-black px-2 py-1 font-semibold mb-2 inline-block rounded-sm">
          {address.addressType}
        </span>
        <h3 className="font-medium text-[15px] text-black">
          {address.name} <span>{address.phone}</span>
        </h3>
        <p className="text-[14px] text-gray-700">{address.addressLine1}</p>

        <p className="text-[14px] text-gray-700">
          {address.city}, {address.state} - {address.postalCode}
        </p>

        {address.landmark && (
          <p className="text-[14px] text-gray-700">
            Landmark: {address.landmark}
          </p>
        )}

        <p className="text-[14px] text-gray-700">{address.country}</p>

        {address.isDefault && (
          <span className="mt-2 inline-block text-xs font-semibold text-green-600">
            Default Address
          </span>
        )}
      </div>
      <MenuButton
        onEdit={() => openAddressPanel(address)}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default AddressBox;

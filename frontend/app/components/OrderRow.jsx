'use client';
import { IoMdCheckmark } from 'react-icons/io';
import { LiaAngleDownSolid } from 'react-icons/lia';
import { IoMdClose } from 'react-icons/io';
import { useState } from 'react';

const OrderRow = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpandRow = () => {
    setIsExpanded((prev) => !prev);
  };
  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800 border-b border-gray-200">
        <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={handleExpandRow}
            aria-label={isExpanded ? 'Collapse order' : 'Expand order'}
            aria-expanded={isExpanded}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-black transition-colors hover:bg-gray-300"
          >
            <LiaAngleDownSolid
              size={20}
              className={`transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>
        </td>
        <td>#3413</td>
        <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3 w-80">
            <div className="rounded-circle w-14 h-14">
              <img src="/man.png" alt="user" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-black text-[14px] font-semibold">
                Dr. Ernest Fritsch-Shanahan
              </span>
              <span className="text-gray-500 text-[14px]">
                august17@gmail.com
              </span>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 text-black dark:text-slate-400">
          pay_SL_surtnkgsjsj
        </td>
        <td className="px-4 py-4 text-black dark:text-slate-400">
          <p className="w-55">Dr. Ernest Fritsch-Shanahan</p>
        </td>
        <td className="px-4 py-4 text-black dark:text-slate-400">
          <p className="w-35">+91-8742994237</p>
        </td>
        <td className="px-4 py-4 text-black dark:text-slate-400">
          <p className="w-55">
            H. No. 1/445 Naurangabad Shastri Nagar Chawni Road Aligarh
          </p>
        </td>
        <td className="px-4 py-4 text-black dark:text-slate-400">
          <p>202001</p>
        </td>
        <td className="px-4 py-4 text-black dark:text-slate-400">
          <p>&#8377; 199.99</p>
        </td>
        <td className="px-4 py-4 text-black dark:text-slate-400">
          <p>amit.firstdesign@gmail.com</p>
        </td>
        <td className="px-4 py-4 text-black dark:text-slate-400">
          <p>Ul_Rtdfshjss</p>
        </td>
        <td className="px-4 py-4 text-black dark:text-slate-400">
          <p>
            <span className="inline-flex items-center rounded-full bg-green-600 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-green-600/20 dark:bg-green-900/20 dark:text-green-400">
              Confirm
            </span>
          </p>
        </td>
        <td className="px-4 py-4 text-black dark:text-slate-400">
          <p className="w-24">2026-8-14</p>
        </td>
      </tr>
      {isExpanded && (
        <tr className={`bg-gray-100 border-b border-gray-300`}>
          <td colSpan={4} className="p-5">
            <div className="flex items-center gap-1">
              <div className="rounded-md overflow-hidden relative w-20 h-20">
                <img
                  src="/products/footwear/item1.jpg"
                  alt="item 1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="ml-3">
                <h2 className="text-gray-800 text-[15px] font-semibold flex flex-col">
                  Footwear 1
                  <span className="text-gray-600 text-[13px] font-medium">
                    Sole Color: Pink
                  </span>
                  <span className="text-gray-600 text-[13px] font-medium">
                    Strip Color: Yellow
                  </span>
                  <span className="text-black text-[13px] font-medium">
                    Unit Price: &#8377;199.99
                  </span>
                </h2>
              </div>
            </div>
          </td>
          <td className="p-5">
            <p className="inline-flex">
              <IoMdClose size={20} className="mr-2" />2
            </p>
          </td>
          <td colSpan={8} className="p-5">
            <p className="text-gray-900 font-medium">&#8377;399.98</p>
          </td>
        </tr>
      )}
    </>
  );
};

export default OrderRow;

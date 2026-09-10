'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const SortOptions = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathName = usePathname();

  const handleSortChange = (event) => {
    const value = event.target.value;

    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set('sort', value);
    } else {
      params.delete('sort');
    }

    params.set('page', '1'); // Reset to page 1 whenever sort changes
    router.push(`${pathName}?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-end gap-3">
      <label className="text-md font-medium text-black">Sort by</label>
      <select
        id="sort"
        className="border p-1 border-gray-600 rounded-md focus:outline-none"
        onChange={handleSortChange}
        defaultValue={searchParams.get('sort') || ''}
      >
        <option value="">Default</option>
        <option value="priceAsc">Price: Low to High</option>
        <option value="priceDesc">Price: High to Low</option>
      </select>
    </div>
  );
};

export default SortOptions;

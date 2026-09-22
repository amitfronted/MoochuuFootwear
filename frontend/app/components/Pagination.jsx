import React from 'react';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalResults = 0,
  limit = 8,
  onPageChange,
}) => {
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalResults);

  // Helper to generate page number buttons with ellipses
  const getPageNumbers = () => {
    const pages = [];
    const delta = 1; // Number of pages to show around current page

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };
  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-6 mt-8">
      {/* Mobile view controls */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="relative inline-flex items-center rounded-md border border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="relative ml-3 inline-flex items-center rounded-md border border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      {/* Desktop view controls */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-black">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalResults}</span> results
          </p>
        </div>
        <div>
          <nav
            aria-label="Pagination"
            className="isolate inline-flex -space-x-px rounded-md shadow-xs"
          >
            {/* Previous Button */}
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 border border-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <BsChevronLeft aria-hidden="true" className="size-5" />
            </button>

            {/* Page Number Buttons */}
            {getPageNumbers().map((pageItem, index) =>
              pageItem === '...' ? (
                <span
                  key={`ellipsis-${index}`}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300"
                >
                  ...
                </span>
              ) : (
                <button
                  key={pageItem}
                  onClick={() => onPageChange(pageItem)}
                  aria-current={currentPage === pageItem ? 'page' : undefined}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold border ${
                    currentPage === pageItem
                      ? 'z-10 bg-black text-white border-black focus-visible:outline-2 focus-visible:outline-black'
                      : 'text-gray-900 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageItem}
                </button>
              ),
            )}

            {/* Next Button */}
            <button
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-black border border-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <BsChevronRight aria-hidden="true" className="size-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination;

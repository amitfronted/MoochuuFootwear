'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

import { sizeCharts } from '../data/sizeCharts';

const SizeChart = ({ isOpen, onClose, sizeChartCode }) => {
  const [activeTab, setActiveTab] = useState('size');

  const sizeData = sizeCharts[sizeChartCode] || [];

  // Reset tab whenever drawer is opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab('size');
    }
  }, [isOpen]);

  // Prevent background page scrolling when drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-99998 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-99999 h-full w-full max-w-150 overflow-y-auto bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Size chart"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-white">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute md:right-5 right-2 top-2 md:top-5 z-20 text-3xl leading-none text-gray-700 transition hover:text-black"
            aria-label="Close size chart"
          >
            ×
          </button>

          {/* Tabs */}
          <div className="grid grid-cols-2">
            {/* Size Chart Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('size')}
              className={`relative py-5 text-[11px] md:text-lg font-medium transition ${
                activeTab === 'size'
                  ? 'text-[#ff385c]'
                  : 'text-black hover:text-[#ff385c]'
              }`}
            >
              Size Chart
              {activeTab === 'size' && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#ff385c]" />
              )}
            </button>

            {/* How To Measure Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('measure')}
              className={`relative py-5 text-[11px] md:text-lg font-medium transition ${
                activeTab === 'measure'
                  ? 'text-[#ff385c]'
                  : 'text-black hover:text-[#ff385c]'
              }`}
            >
              How to measure
              {activeTab === 'measure' && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#ff385c]" />
              )}
            </button>
          </div>
        </div>

        {/* ================= SIZE CHART ================= */}
        {activeTab === 'size' && (
          <div>
            {/* Optional chart code */}
            {sizeChartCode && (
              <div className="px-6 pt-6">
                <p className="text-sm text-gray-500">
                  Size chart:{' '}
                  <span className="font-semibold">{sizeChartCode}</span>
                </p>
              </div>
            )}

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-130">
                {/* Table Header */}
                <div className="grid grid-cols-[70px_1.2fr_1.2fr_1.2fr] border-b bg-gray-50 px-4 py-4 text-center text-sm font-semibold sm:text-base">
                  <div>Moo Chuu</div>
                  <div>UK / India</div>
                  <div>US</div>
                  <div>Foot Length</div>
                </div>

                {/* Size List */}
                {sizeData.length > 0 ? (
                  sizeData.map((item) => (
                    <div
                      key={`${sizeChartCode}-${item.size}-${item.cm}`}
                      className="grid grid-cols-[70px_1.2fr_1.2fr_1.2fr] items-center border-b px-4 py-4 text-center"
                    >
                      {/* Moo Chuu Size */}
                      <div className="text-base font-medium sm:text-lg">
                        {item.size}
                      </div>

                      {/* UK / India */}
                      <div className="text-base sm:text-lg">{item.ukIndia}</div>

                      {/* US */}
                      <div className="text-base sm:text-lg">{item.us}</div>

                      {/* CM */}
                      <div className="text-base sm:text-lg">{item.cm} cm</div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center text-gray-500">
                    Size chart is not available.
                  </div>
                )}
              </div>
            </div>

            {/* Separator */}
            <div className="my-10 h-5 bg-gray-100" />

            {/* How To Measure */}
            <div className="px-6 pb-10">
              <h3 className="mb-8 text-lg font-bold">
                How to measure yourself
              </h3>

              <div className="mx-auto max-w-115">
                <Image
                  src="/mesurre-foot.png"
                  alt="How to measure your foot"
                  width={460}
                  height={500}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= HOW TO MEASURE ================= */}
        {activeTab === 'measure' && (
          <div className="px-6 py-8">
            <h2 className="mb-8 text-xl font-bold">How to measure yourself</h2>

            <div className="mx-auto max-w-115">
              <Image
                src="/mesurre-foot.png"
                alt="How to measure your foot"
                width={460}
                height={500}
                className="h-auto w-full"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SizeChart;

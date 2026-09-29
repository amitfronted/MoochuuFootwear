'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { sizeCharts } from '../data/sizeCharts';

const SizeChart = ({ isOpen, onClose, sizeChartCode }) => {
  const [activeTab, setActiveTab] = useState('size');

  if (!isOpen) return null;
  const sizeData = sizeCharts[sizeChartCode] || [];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-99998 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-99999 h-full w-full max-w-150 overflow-y-auto bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-white">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-20 text-2xl leading-none text-gray-700 hover:text-black"
            aria-label="Close"
          >
            ×
          </button>

          {/* Tabs */}
          <div className="grid grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveTab('size')}
              className={`relative py-5 text-lg font-medium ${
                activeTab === 'size' ? 'text-[#ff385c]' : 'text-black'
              }`}
            >
              Size Chart
              {activeTab === 'size' && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#ff385c]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('measure')}
              className={`relative py-5 text-lg font-medium ${
                activeTab === 'measure' ? 'text-[#ff385c]' : 'text-black'
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
            {/* Table Header */}
            <div className="grid grid-cols-[70px_1fr_1.5fr] border-b py-5 text-center text-lg">
              <div></div>

              <div>Sizes</div>

              <div>Shoe Dimension (cm)</div>
            </div>

            {/* Size List */}
            <div>
              {sizeData.map((item) => (
                <div
                  key={`${item.size}-${item.cm}`}
                  className="grid grid-cols-[70px_1fr_1.5fr] items-center border-b py-4 text-center"
                >
                  <div />

                  <div className="text-lg">{item.size}</div>

                  <div className="text-lg">{item.cm}</div>
                </div>
              ))}
            </div>

            {/* Separator */}
            <div className="my-12 h-7 bg-gray-100" />

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

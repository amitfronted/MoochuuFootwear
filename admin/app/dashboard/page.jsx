'use client';

import React, { useEffect, useState } from 'react';

import DashBoardBox from '../components/DashBoard/DashBoardBox';

import { SlLayers } from 'react-icons/sl';
import { LuLoader, LuPackage, LuCircleCheckBig } from 'react-icons/lu';

import WelcomeBox from '../components/DashBoard/WelcomeBox';

import { fetchDashboardStats } from '@/app/lib/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    deliveredOrders: 0,

    shippedOrders: 0,
    cancelledOrders: 0,

    totalProducts: 0,
    activeProducts: 0,
    draftProducts: 0,

    totalCustomers: 0,

    todayOrders: 0,
    todaySales: 0,

    lowStock: 0,
    outOfStock: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        setLoading(true);

        const response = await fetchDashboardStats();

        if (response?.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Dashboard stats error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, []);

  return (
    <>
      {/* -------------------------------- */}
      {/* WELCOME */}
      {/* -------------------------------- */}

      <WelcomeBox />

      {/* -------------------------------- */}
      {/* ORDER STATISTICS */}
      {/* -------------------------------- */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mt-12 mb-6">
        <DashBoardBox
          title="Total Order"
          icon={<SlLayers />}
          value={loading ? '...' : stats.totalOrders}
          iconColor="text-orange-500"
          iconBgColor="bg-orange-500/10"
        />

        <DashBoardBox
          title="Order Pending"
          icon={<LuLoader />}
          value={loading ? '...' : stats.pendingOrders}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />

        <DashBoardBox
          title="Order Processing"
          icon={<LuPackage />}
          value={loading ? '...' : stats.processingOrders}
          iconColor="text-indigo-500"
          iconBgColor="bg-indigo-500/10"
        />

        <DashBoardBox
          title="Order Delivered"
          icon={<LuCircleCheckBig />}
          value={loading ? '...' : stats.deliveredOrders}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
      </div>

      {/* -------------------------------- */}
      {/* MORE DASHBOARD DATA */}
      {/* -------------------------------- */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <DashBoardBox
          title="Total Products"
          value={loading ? '...' : stats.totalProducts}
          icon={<SlLayers />}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-500/10"
        />

        <DashBoardBox
          title="Active Products"
          value={loading ? '...' : stats.activeProducts}
          icon={<LuCircleCheckBig />}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />

        <DashBoardBox
          title="Customers"
          value={loading ? '...' : stats.totalCustomers}
          icon={<SlLayers />}
          iconColor="text-cyan-500"
          iconBgColor="bg-cyan-500/10"
        />

        <DashBoardBox
          title="Low Stock"
          value={loading ? '...' : stats.lowStock}
          icon={<LuLoader />}
          iconColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
      </div>

      {/* -------------------------------- */}
      {/* TODAY + INVENTORY */}
      {/* -------------------------------- */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <DashBoardBox
          title="Today's Orders"
          value={loading ? '...' : stats.todayOrders}
          icon={<SlLayers />}
          iconColor="text-orange-500"
          iconBgColor="bg-orange-500/10"
        />

        <DashBoardBox
          title="Today's Sales"
          value={
            loading
              ? '...'
              : `₹${Number(stats.todaySales || 0).toLocaleString('en-IN')}`
          }
          icon={<LuCircleCheckBig />}
          iconColor="text-green-500"
          iconBgColor="bg-green-500/10"
        />

        <DashBoardBox
          title="Out of Stock"
          value={loading ? '...' : stats.outOfStock}
          icon={<LuLoader />}
          iconColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />

        <DashBoardBox
          title="Cancelled Orders"
          value={loading ? '...' : stats.cancelledOrders}
          icon={<LuPackage />}
          iconColor="text-gray-500"
          iconBgColor="bg-gray-500/10"
        />
      </div>
    </>
  );
};

export default Dashboard;

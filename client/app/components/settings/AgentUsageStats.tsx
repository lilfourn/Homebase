"use client";

import { useAuth } from "@clerk/nextjs";
import { AlertCircle, BarChart, Loader2, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { getUserUsage } from "../../api/agents.api";

interface UsageStats {
  remainingTasks: number;
  usedTasks: number;
  totalTasks: number;
  lastReset: string;
}

export default function AgentUsageStats() {
  const { getToken } = useAuth();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return;

        const response = await getUserUsage(token);
        if (response.success && response.data) {
          setUsage(response.data);
        }
      } catch (err) {
        console.error("Error fetching usage stats:", err);
        setError("Failed to load usage statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [getToken]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--custom-primary-color)]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const usagePercentage = usage.totalTasks > 0 
    ? Math.round((usage.usedTasks / usage.totalTasks) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-[var(--custom-primary-color)] bg-opacity-10 rounded-xl flex items-center justify-center mr-4">
          <BarChart className="h-6 w-6 text-[var(--custom-primary-color)]" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">AI Agent Usage</h3>
          <p className="text-sm text-gray-500 mt-1">Monthly task allocation</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Usage Progress */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-medium text-gray-700">Tasks Used</span>
            <span className="text-sm text-gray-600">
              {usage.usedTasks} / {usage.totalTasks}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-[var(--custom-primary-color)] rounded-full transition-all duration-500"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {usage.remainingTasks} tasks remaining this month
          </p>
        </div>

        {/* Usage Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Remaining</span>
              <Zap className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {usage.remainingTasks}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Used</span>
              <BarChart className="h-4 w-4 text-[var(--custom-primary-color)]" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {usage.usedTasks}
            </p>
          </div>
        </div>

        {/* Reset Info */}
        {usage.lastReset && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Usage resets on the first day of each month
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
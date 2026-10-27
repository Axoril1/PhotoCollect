import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Zap,
  CheckCircle,
  HardDrive,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Star,
  RefreshCw,
} from "lucide-react";

import subscriptionApi from "../services/subscriptionApi.js";
import { subscriptionService } from "../services/subscription.service.js";
import { formatBytes } from "../admin/utils/formatters.js";

export function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchSubscriptionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansRes, usageRes] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getUsage(),
      ]);

      setPlans(plansRes.plans || []);
      setSubscription(usageRes.subscription);
      setUsageData(usageRes);
    } catch (err) {
      console.error("[SubscriptionPage] Error loading subscription:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const handlePlanChange = async (planSlug) => {
    if (subscription?.planSlug === planSlug) return;
    setIsUpdating(true);

    try {
      if (planSlug === "free") {
        await subscriptionApi.downgradePlan(planSlug);
      } else {
        await subscriptionApi.upgradePlan(planSlug);
      }
      fetchSubscriptionData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update subscription");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-6xl mx-auto">
        <div className="h-32 bg-slate-900 animate-pulse rounded-2xl" />
        <div className="h-64 bg-slate-900 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const currentPlanSlug = subscription?.planSlug || "free";
  const limits = usageData?.limits || { maxEvents: 1, maxStorageGB: 2 };
  const usage = usageData?.usage || { eventsCreated: 0, storageBytes: 0, imagesUploaded: 0 };
  const progress = usageData?.quotaProgress || { eventsPercent: 0, storagePercent: 0 };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      {/* Page Title Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-amber-500" />
          <span>Subscription & Billing Governance</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Manage your subscription tier, monitor storage quotas, and unlock enterprise feature capabilities.
        </p>
      </div>

      {/* Current Subscription Card & Quotas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Plan Summary (1 col) */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Current Plan
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-wide mt-0.5">
                {subscription?.plan?.name || "Free Tier"}
              </h2>
            </div>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full border ${subscriptionService.getStatusBadgeClass(
                subscription?.status || "ACTIVE"
              )}`}
            >
              {subscriptionService.formatStatus(subscription?.status || "ACTIVE")}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-3xl font-black text-amber-400 font-mono">
              ${subscription?.plan?.monthlyPrice || 0}
            </span>
            <span className="text-xs text-slate-400"> / month</span>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex justify-between">
              <span>Billing Cycle</span>
              <span className="font-semibold text-slate-200">Monthly</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Provider</span>
              <span className="font-semibold text-slate-200 uppercase font-mono">
                {subscription?.provider || "Internal"}
              </span>
            </div>
          </div>
        </div>

        {/* Quota Progress Bars (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Usage & Quota Consumption</span>
          </h3>

          <div className="space-y-4 text-xs">
            {/* Events Quota */}
            <div>
              <div className="flex justify-between mb-1.5 font-semibold">
                <span className="text-slate-400">Events Created</span>
                <span className="text-slate-200 font-mono">
                  {usage.eventsCreated} / {limits.maxEvents === -1 ? "Unlimited" : limits.maxEvents}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.eventsPercent}%` }}
                />
              </div>
            </div>

            {/* Storage Quota */}
            <div>
              <div className="flex justify-between mb-1.5 font-semibold">
                <span className="text-slate-400">Cloud Storage Volume</span>
                <span className="text-slate-200 font-mono">
                  {formatBytes(usage.storageBytes)} / {limits.maxStorageGB} GB
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.storagePercent}%` }}
                />
              </div>
            </div>

            {/* Images Count */}
            <div>
              <div className="flex justify-between mb-1.5 font-semibold">
                <span className="text-slate-400">Total Images Uploaded</span>
                <span className="text-slate-200 font-mono">
                  {usage.imagesUploaded} Photos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Matrix & Comparison Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Select a Subscription Tier</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = currentPlanSlug === p.slug;
            return (
              <div
                key={p.slug}
                className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 transition-all ${
                  isCurrent
                    ? "bg-slate-900 border-amber-500/80 shadow-2xl ring-1 ring-amber-500/40"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white uppercase">{p.name}</h3>
                    {isCurrent && (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                        Active Plan
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 min-h-[36px]">{p.description}</p>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white font-mono">${p.monthlyPrice}</span>
                    <span className="text-xs text-slate-500">/ mo</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{p.limits?.maxEvents === -1 ? "Unlimited Events" : `${p.limits?.maxEvents} Active Event`}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{p.limits?.maxStorageGB} GB Cloud Storage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{p.limits?.maxImages === -1 ? "Unlimited Images" : `${p.limits?.maxImages} Images Limit`}</span>
                    </li>
                  </ul>
                </div>

                <button
                  disabled={isCurrent || isUpdating}
                  onClick={() => handlePlanChange(p.slug)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow transition-all ${
                    isCurrent
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-amber-500/20"
                  }`}
                >
                  {isCurrent ? "Current Active Plan" : `Select ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SubscriptionPage;

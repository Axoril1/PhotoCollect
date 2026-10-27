import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  ExternalLink,
  Zap,
  CheckCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  FileText,
} from "lucide-react";

import billingApi from "../services/billingApi.js";
import subscriptionApi from "../services/subscriptionApi.js";
import { subscriptionService } from "../services/subscription.service.js";
import { formatDate } from "../admin/utils/formatters.js";

export function BillingPage() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [interval, setInterval] = useState("monthly");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  const fetchBillingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansRes, subRes, histRes] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getSubscription(),
        billingApi.getBillingHistory(),
      ]);

      setPlans(plansRes.plans || []);
      setSubscription(subRes.subscription);
      setHistory(histRes.history || []);
    } catch (err) {
      console.error("[BillingPage] Error loading billing data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleResync = async () => {
    setIsResyncing(true);
    try {
      await billingApi.resyncSubscription();
      await fetchBillingData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to resync subscription with Stripe");
    } finally {
      setIsResyncing(false);
    }
  };

  const handleManagePortal = async () => {
    setIsProcessing(true);
    try {
      const { portalUrl } = await billingApi.createPortalSession();
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to open Stripe Billing Portal");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribe = async (planSlug) => {
    if (planSlug === "free") return;
    setIsProcessing(true);

    try {
      const { checkoutUrl } = await billingApi.createCheckoutSession({ planSlug, interval });
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to initiate Stripe Checkout");
    } finally {
      setIsProcessing(false);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-amber-500" />
            <span>Stripe Billing & Subscriptions</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Manage your payment methods, view invoices, and upgrade your subscription tier via Stripe.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResync}
            disabled={isResyncing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResyncing ? "animate-spin" : ""}`} />
            <span>Resync Status</span>
          </button>

          <button
            onClick={handleManagePortal}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 shrink-0"
          >
            <ExternalLink className="w-4 h-4 text-amber-400" />
            <span>Manage Billing Portal</span>
          </button>
        </div>
      </div>

      {/* Active Subscription Summary */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Platform Subscription
          </span>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white uppercase font-mono">
              {subscription?.plan?.name || "Free Tier"}
            </h2>
            <span
              className={`px-3 py-0.5 text-xs font-bold rounded-full border ${subscriptionService.getStatusBadgeClass(
                subscription?.status || "ACTIVE"
              )}`}
            >
              {subscriptionService.formatStatus(subscription?.status || "ACTIVE")}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Provider: <span className="font-mono text-amber-400 uppercase font-bold">{subscription?.provider || "Stripe"}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManagePortal}
            disabled={isProcessing}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-all"
          >
            Update Payment Method
          </button>
        </div>
      </div>

      {/* Interval Selector Toggle */}
      <div className="flex justify-center">
        <div className="p-1 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-1 text-xs">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-4 py-2 rounded-xl font-bold transition-colors ${
              interval === "monthly" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-1.5 ${
              interval === "yearly" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Yearly Billing</span>
            <span className="px-1.5 py-0.5 text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = currentPlanSlug === p.slug;
          const price = interval === "yearly" ? p.yearlyPrice : p.monthlyPrice;

          return (
            <div
              key={p.slug}
              className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 transition-all ${
                isCurrent
                  ? "bg-slate-900 border-amber-500 shadow-2xl ring-1 ring-amber-500/40"
                  : "bg-slate-950 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white uppercase">{p.name}</h3>
                  {isCurrent && (
                    <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 min-h-[36px]">{p.description}</p>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white font-mono">${price}</span>
                  <span className="text-xs text-slate-500">/ {interval === "yearly" ? "yr" : "mo"}</span>
                </div>

                <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{p.limits?.maxEvents === -1 ? "Unlimited Events" : `${p.limits?.maxEvents} Event`}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{p.limits?.maxStorageGB} GB Cloud Storage</span>
                  </li>
                </ul>
              </div>

              <button
                disabled={isCurrent || isProcessing}
                onClick={() => handleSubscribe(p.slug)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs shadow transition-all ${
                  isCurrent
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-amber-500/20"
                }`}
              >
                {isCurrent ? "Current Plan" : `Upgrade to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Billing Events History */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" />
          <span>Billing History & Event Logs</span>
        </h2>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-xs">
          {history.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No previous billing activity recorded.</div>
          ) : (
            <table className="w-full text-left text-slate-300 border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Plan Shift</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.map((h) => (
                  <tr key={h._id}>
                    <td className="px-4 py-3 font-bold text-amber-400">{h.event}</td>
                    <td className="px-4 py-3 text-slate-200 uppercase font-mono">
                      {h.oldPlanSlug || "FREE"} &rarr; {h.newPlanSlug}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(h.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default BillingPage;

import { useState, useEffect, useCallback } from "react";
import {
  Gift,
  Share2,
  Wallet as WalletIcon,
  Tag,
  Copy,
  Check,
  Award,
  Sparkles,
  TrendingUp,
  Percent,
} from "lucide-react";

import growthApi from "../services/growthApi.js";
import { formatCurrency } from "../admin/utils/formatters.js";

export function GrowthDashboardPage() {
  const [walletData, setWalletData] = useState(null);
  const [referralData, setReferralData] = useState(null);
  const [affiliateData, setAffiliateData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const fetchGrowthData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [wRes, rRes, aRes, cRes] = await Promise.all([
        growthApi.getWallet(),
        growthApi.getReferrals(),
        growthApi.getAffiliate(),
        growthApi.getCampaigns(),
      ]);

      setWalletData(wRes);
      setReferralData(rRes);
      setAffiliateData(aRes.affiliate);
      setCampaigns(cRes.campaigns || []);
    } catch (err) {
      console.error("[GrowthDashboardPage] Error loading growth data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrowthData();
  }, [fetchGrowthData]);

  const handleCopyReferral = () => {
    if (referralData?.referralLink) {
      navigator.clipboard.writeText(referralData.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsRedeeming(true);
    try {
      const res = await growthApi.redeemCoupon(couponCode);
      setAlertMessage({ type: "success", text: res.message });
      setCouponCode("");
      await fetchGrowthData();
    } catch (err) {
      setAlertMessage({ type: "error", text: err.response?.data?.error || "Failed to redeem coupon." });
    } finally {
      setIsRedeeming(false);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-amber-500" />
          <span>Growth Engine, Wallet & Rewards</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Earn credits by inviting organizers, redeem promo coupons, and track affiliate earnings.
        </p>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            alertMessage.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
          }`}
        >
          <span>{alertMessage.text}</span>
          <button onClick={() => setAlertMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Top Cards: Wallet Balance & Referral Link */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet Balance Card */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <WalletIcon className="w-4 h-4 text-emerald-400" />
              <span>Credit Wallet Balance</span>
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
              AVAILABLE FOR CHECKOUT
            </span>
          </div>

          <p className="text-4xl font-black text-white font-mono">
            {formatCurrency((walletData?.wallet?.balanceCents || 0) / 100)}
          </p>

          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-300 mb-2">Recent Transactions</h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto text-[11px]">
              {walletData?.transactions?.length === 0 ? (
                <div className="text-slate-500">No transactions recorded yet.</div>
              ) : (
                walletData?.transactions?.map((t) => (
                  <div key={t._id} className="flex justify-between items-center p-2 bg-slate-950 rounded-lg">
                    <span className="text-slate-300">{t.description}</span>
                    <span className={`font-mono font-bold ${t.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.type === "CREDIT" ? "+" : "-"}{formatCurrency(t.amountCents / 100)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Referral Program Card */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Share2 className="w-4 h-4 text-amber-500" />
              <span>Referral Program ($10 Credit / Invite)</span>
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
              UNLIMITED
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Share your personal invite link. Earn $10 in wallet credits for every organizer who creates an account!
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={referralData?.referralLink || ""}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-amber-400"
            />
            <button
              onClick={handleCopyReferral}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 text-center text-xs">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-500 block">Total Referrals</span>
              <span className="text-lg font-black text-white font-mono">{referralData?.totalReferrals || 0}</span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-500 block">Rewards Earned</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {formatCurrency((referralData?.totalRewardsCents || 0) / 100)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Coupon Redemption & Affiliate Program */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Redeem Coupon */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-400" />
            <span>Redeem Coupon or Promo Code</span>
          </h3>

          <div className="flex gap-2 text-xs">
            <input
              type="text"
              placeholder="WELCOME20, BLACKFRIDAY..."
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleRedeemCoupon}
              disabled={isRedeeming || !couponCode.trim()}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 shrink-0"
            >
              {isRedeeming ? "Applying..." : "Redeem"}
            </button>
          </div>
        </div>

        {/* Affiliate Program Card */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Affiliate Partner Status</span>
            </h3>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-full">
              {affiliateData?.commissionPercent || 20}% COMMISSION
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-500 block text-[10px]">Affiliate Code</span>
              <span className="font-mono font-bold text-purple-400">{affiliateData?.affiliateCode}</span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-500 block text-[10px]">Pending Payout</span>
              <span className="font-mono font-bold text-amber-400">
                {formatCurrency((affiliateData?.pendingPayoutCents || 0) / 100)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-500 block text-[10px]">Total Paid Out</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatCurrency((affiliateData?.paidOutCents || 0) / 100)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GrowthDashboardPage;

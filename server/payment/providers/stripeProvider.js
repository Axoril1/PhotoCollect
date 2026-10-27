/**
 * QR Snap - Stripe Payment Provider Adapter
 */

import Stripe from "stripe";

let stripeClient = null;

export function getStripeClient() {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock_secret_key";
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2023-10-16",
    });
  }
  return stripeClient;
}

/**
 * Get environment variable price ID for plan and interval
 */
export function getPriceIdForPlan(planSlug, interval = "monthly") {
  const isYearly = interval === "yearly";

  if (planSlug === "pro") {
    return isYearly
      ? process.env.STRIPE_PRICE_PRO_YEARLY
      : process.env.STRIPE_PRICE_PRO_MONTHLY;
  }

  if (planSlug === "business") {
    return isYearly
      ? process.env.STRIPE_PRICE_BUSINESS_YEARLY
      : process.env.STRIPE_PRICE_BUSINESS_MONTHLY;
  }

  return null;
}

/**
 * Get plan slug from Stripe Price ID
 */
export function getPlanSlugFromPriceId(priceId) {
  if (
    priceId === process.env.STRIPE_PRICE_PRO_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_PRO_YEARLY
  ) {
    return "pro";
  }

  if (
    priceId === process.env.STRIPE_PRICE_BUSINESS_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_BUSINESS_YEARLY
  ) {
    return "business";
  }

  return "free";
}

/**
 * Create or retrieve Stripe Customer
 */
export async function createStripeCustomer({ email, name, userId }) {
  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId: userId.toString(),
    },
  });
  return customer;
}

/**
 * Create Stripe Checkout Session
 */
export async function createStripeCheckoutSession({ customerId, priceId, userId, successUrl, cancelUrl }) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId.toString(),
    metadata: {
      userId: userId.toString(),
      priceId,
    },
  });
  return session;
}

/**
 * Create Stripe Billing Portal Session
 */
export async function createStripePortalSession({ customerId, returnUrl }) {
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session;
}

/**
 * Construct and verify Stripe Webhook Event signature
 */
export function constructWebhookEvent(payload, signature) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock";
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export default {
  getStripeClient,
  getPriceIdForPlan,
  getPlanSlugFromPriceId,
  createStripeCustomer,
  createStripeCheckoutSession,
  createStripePortalSession,
  constructWebhookEvent,
};

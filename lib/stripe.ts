// The client only uses Stripe's hosted checkout URL.
// Do not trust any client-side "paid" state; Stripe/webhooks should become the
// source of truth before enforcing subscription entitlements in the product.
// Configure the Stripe Payment Link to redirect to /checkout/success after
// completion so customers land on the in-app confirmation page.
export const STRIPE_LINK = "https://buy.stripe.com/test_14AcN73VY2Higar1jo1gs00";

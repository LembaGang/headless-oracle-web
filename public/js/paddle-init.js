// Shared Paddle initialization — loaded on every page.
// Initialises Paddle and opens the checkout overlay if _ptxn is present
// in the URL (Paddle appends this after a successful hosted checkout start).
(function () {
  Paddle.Initialize({ token: 'live_8d7ef54e91c43573f6afd77c7bd' });
  const ptxn = new URLSearchParams(window.location.search).get('_ptxn');
  if (ptxn) {
    Paddle.Checkout.open({ transactionId: ptxn });
  }
}());

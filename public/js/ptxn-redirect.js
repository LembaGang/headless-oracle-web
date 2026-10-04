// Paddle's hosted checkout can return a buyer to any page of the site with ?_ptxn=<transaction>.
// Only /pricing loads Paddle and holds the post-payment key dialog, so a page without Paddle
// sends the buyer there with the query intact instead of dropping the checkout.
(function () {
  if (location.pathname === '/pricing' || location.pathname === '/pricing.html') return;
  if (new URLSearchParams(location.search).has('_ptxn')) location.replace('/pricing' + location.search);
}());

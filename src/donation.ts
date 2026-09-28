export const donationSupportedAtKey = "donation-supported-at";

type DonationWindow = {
  location: { href: string };
  history: Pick<History, "state" | "replaceState">;
  localStorage: Pick<Storage, "setItem">;
};

// ricos.site/donate sends people back with ?supported=1 after a payment.
// Remember when, then drop only that parameter from the address bar.
export function recordDonationReturn(win: DonationWindow = window) {
  const url = new URL(win.location.href);
  if (url.searchParams.get("supported") !== "1") return;

  try {
    win.localStorage.setItem(donationSupportedAtKey, String(Date.now()));
  } catch {
    // Storage can be blocked (private mode, disabled site data).
  }

  url.searchParams.delete("supported");
  win.history.replaceState(win.history.state, "", url.pathname + url.search + url.hash);
}

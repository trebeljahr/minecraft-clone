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

/** Prepare the link for normal clicks, keyboard use, and opening a new tab. */
export function prepareDonationLink() {
  const link = document.getElementById("donateLink") as HTMLAnchorElement | null;
  if (!link) return;
  const update = () => {
    const url = new URL("https://ricos.site/donate/minecraft-clone");
    url.searchParams.set("returnTo", window.location.href);
    link.href = url.href;
  };
  for (const event of ["click", "auxclick", "pointerdown", "focus", "contextmenu"]) {
    link.addEventListener(event, update);
  }
  update();
}

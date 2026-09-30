export const donationSupportedAtKey = "donation-supported-at";

// Webpack replaces this expression at build time; no browser process shim is needed.
declare const process: { readonly env: { readonly NODE_ENV: string } };

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
    const current = new URL(window.location.href);
    if (
      process.env.NODE_ENV === "development" ||
      ["localhost", "127.0.0.1", "[::1]"].includes(current.hostname)
    ) {
      url.protocol = "http:";
      url.host = "localhost:3713";
    }
    url.searchParams.set("returnTo", current.href);
    link.href = url.href;
  };
  for (const event of ["click", "auxclick", "pointerdown", "focus", "contextmenu"]) {
    link.addEventListener(event, update);
  }
  update();
}

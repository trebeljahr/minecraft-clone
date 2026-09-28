import { donationSupportedAtKey, recordDonationReturn } from "../src/donation";

function fakeWindow(href: string) {
  return {
    location: { href },
    history: { state: { keep: true }, replaceState: jest.fn() },
    localStorage: { setItem: jest.fn() },
  };
}

describe("recordDonationReturn", () => {
  it("stores the time and strips only the supported param", () => {
    jest.spyOn(Date, "now").mockReturnValue(1234);
    const win = fakeWindow("https://mc.trebeljahr.com/?seed=4&supported=1&debug=1#spawn");

    recordDonationReturn(win);

    expect(win.localStorage.setItem).toHaveBeenCalledWith(donationSupportedAtKey, "1234");
    expect(win.history.replaceState).toHaveBeenCalledWith(
      { keep: true },
      "",
      "/?seed=4&debug=1#spawn",
    );
  });

  it("leaves no empty query string when supported was the only param", () => {
    const win = fakeWindow("https://mc.trebeljahr.com/?supported=1");

    recordDonationReturn(win);

    expect(win.history.replaceState).toHaveBeenCalledWith({ keep: true }, "", "/");
  });

  it("does nothing without supported=1", () => {
    const win = fakeWindow("https://mc.trebeljahr.com/?supported=0#x");

    recordDonationReturn(win);

    expect(win.localStorage.setItem).not.toHaveBeenCalled();
    expect(win.history.replaceState).not.toHaveBeenCalled();
  });

  it("still strips the param when storage throws", () => {
    const win = fakeWindow("https://mc.trebeljahr.com/?supported=1");
    win.localStorage.setItem.mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => recordDonationReturn(win)).not.toThrow();
    expect(win.history.replaceState).toHaveBeenCalledWith({ keep: true }, "", "/");
  });
});

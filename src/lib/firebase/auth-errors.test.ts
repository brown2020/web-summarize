import { describe, expect, it } from "vitest";
import { authMessage } from "./auth-errors";

describe("authMessage", () => {
  it("explains when the email already uses a different sign-in method", () => {
    expect(
      authMessage({ code: "auth/account-exists-with-different-credential" })
    ).toBe(
      "An account already exists for this email with a different sign-in method. Sign in with email and password, or use the email link."
    );
  });

  it("does not echo an unknown provider message", () => {
    expect(authMessage({ code: "auth/internal-error", message: "secret detail" })).toBe(
      "Sign-in failed. Try again."
    );
  });
});

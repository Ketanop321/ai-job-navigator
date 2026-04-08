import { beforeEach, describe, expect, it } from "vitest";
import { clearStoredToken, getStoredToken, storeToken } from "@/lib/session";

describe("session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and retrieves auth token", () => {
    storeToken("sample-token");
    expect(getStoredToken()).toBe("sample-token");
  });

  it("clears auth token", () => {
    storeToken("sample-token");
    clearStoredToken();
    expect(getStoredToken()).toBeNull();
  });
});

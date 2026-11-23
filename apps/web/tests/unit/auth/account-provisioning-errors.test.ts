import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  serviceClient: vi.fn(),
  getVerifiedSession: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.serviceClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/session", () => ({ getVerifiedSession: mocks.getVerifiedSession }));
vi.mock("@/lib/env", () => ({
  getPublicEnv: () => ({ NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.test" }),
  getServiceRoleKey: () => "service-role-key",
  getSiteUrl: () => "https://example.test",
}));

import { createInternalAccount } from "@/features/admin/account-actions";
import { signUpWithCredentials } from "@/features/auth/actions";

function createAccountForm() {
  const formData = new FormData();
  formData.set("username", "newuser");
  formData.set("email", "newuser@example.test");
  formData.set("password", "Strong-Password-123");
  formData.append("roles", "contributor");
  return formData;
}

function signUpForm() {
  const formData = new FormData();
  formData.set("username", "newuser");
  formData.set("email", "newuser@example.test");
  formData.set("password", "Strong-Password-123");
  return formData;
}

describe("account provisioning provider failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedSession.mockResolvedValue({
      userId: "admin-id",
      username: "admin",
      roles: ["admin"],
    });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const createUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null });
    mocks.serviceClient.mockReturnValue({
      from,
      auth: { admin: { createUser } },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports an Auth response with no user when provisioning an internal account", async () => {
    await expect(createInternalAccount({}, createAccountForm())).resolves.toMatchObject({
      error: "The account could not be created. Check the email and try again.",
      errorId: expect.any(String),
    });

    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("reports an Auth response with no user when signing up", async () => {
    await expect(signUpWithCredentials({}, signUpForm())).resolves.toMatchObject({
      error: "We could not create the account. Check the details and try again.",
      errorId: expect.any(String),
    });

    expect(console.error).toHaveBeenCalledTimes(1);
  });
});

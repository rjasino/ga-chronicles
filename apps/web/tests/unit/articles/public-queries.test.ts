import { beforeEach, describe, expect, it, vi } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from }) }));
import { getPublishedArticle, listPublishedArticles } from "@/features/articles/queries";

describe("public article queries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters the public list to published records", async () => {
    const rows = [{ id: "a", status: "published", title: "Launch" }];
    const order = vi.fn().mockResolvedValue({ data: rows, error: null });
    const eq = vi.fn().mockReturnValue({ order });
    from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) });
    expect(await listPublishedArticles()).toEqual(rows);
    expect(eq).toHaveBeenCalledWith("status", "published");
  });

  it("returns null when the slug is missing", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqStatus = vi.fn().mockReturnValue({ maybeSingle });
    const eqSlug = vi.fn().mockReturnValue({ eq: eqStatus });
    from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqSlug }) });
    expect(await getPublishedArticle("missing")).toBeNull();
    expect(eqStatus).toHaveBeenCalledWith("status", "published");
  });
});

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("voting procedures", () => {
  it("getCandidates returns list of candidates", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const candidates = await caller.voting.getCandidates();

    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]).toHaveProperty("id");
    expect(candidates[0]).toHaveProperty("name");
    expect(candidates[0]).toHaveProperty("votes");
  });

  it("hasVoted returns false for new voter", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const voterIdentifier = "test-voter-" + Date.now();
    const hasVoted = await caller.voting.hasVoted({ voterIdentifier });

    expect(hasVoted).toBe(false);
  });

  it("vote mutation succeeds and updates candidates", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const voterIdentifier = "test-voter-" + Date.now();

    // Get candidates first
    const candidatesBefore = await caller.voting.getCandidates();
    expect(candidatesBefore.length).toBeGreaterThan(0);

    const candidateToVoteFor = candidatesBefore[0];
    const votesBefore = candidateToVoteFor.votes;

    // Vote
    const result = await caller.voting.vote({
      candidateId: candidateToVoteFor.id,
      voterIdentifier,
    });

    expect(result.success).toBe(true);
    expect(Array.isArray(result.candidates)).toBe(true);

    // Check that vote count increased
    const votedCandidate = result.candidates.find((c) => c.id === candidateToVoteFor.id);
    expect(votedCandidate).toBeDefined();
    expect(votedCandidate!.votes).toBe(votesBefore + 1);
  });

  it("prevents duplicate voting from same voter", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const voterIdentifier = "test-voter-duplicate-" + Date.now();
    const candidates = await caller.voting.getCandidates();
    const candidateId = candidates[0].id;

    // First vote should succeed
    await caller.voting.vote({
      candidateId,
      voterIdentifier,
    });

    // Second vote should fail
    try {
      await caller.voting.vote({
        candidateId,
        voterIdentifier,
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
      const errorMessage = (error as any).message || "";
      // Check for Arabic message about already voting
      expect(errorMessage).toContain("قد قام بالتصويت");
    }
  });

  it("hasVoted returns true after voting", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const voterIdentifier = "test-voter-check-" + Date.now();
    const candidates = await caller.voting.getCandidates();

    // Vote
    await caller.voting.vote({
      candidateId: candidates[0].id,
      voterIdentifier,
    });

    // Check vote status
    const hasVoted = await caller.voting.hasVoted({ voterIdentifier });
    expect(hasVoted).toBe(true);
  });
});

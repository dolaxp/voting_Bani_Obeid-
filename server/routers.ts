import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getAllCandidates, hasVoted, addVote, initializeCandidates } from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  voting: router({
    getCandidates: publicProcedure.query(async () => {
      await initializeCandidates();
      return await getAllCandidates();
    }),

    hasVoted: publicProcedure.input(z.object({ voterIdentifier: z.string() })).query(async ({ input }) => {
      return await hasVoted(input.voterIdentifier);
    }),

    vote: publicProcedure
      .input(
        z.object({
          candidateId: z.number().int().positive(),
          voterIdentifier: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await addVote(input.candidateId, input.voterIdentifier);
          const candidates = await getAllCandidates();
          return { success: true, candidates };
        } catch (error) {
          if (error instanceof Error && error.message.includes("already voted")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "هذا الجهاز قد قام بالتصويت بالفعل",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل التصويت، يرجى المحاولة مرة أخرى",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

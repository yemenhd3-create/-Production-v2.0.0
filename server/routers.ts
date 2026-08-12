import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { developerProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authenticateDeveloper } from "./developerAuth";
import { DEVELOPER_SESSION_COOKIE, DEVELOPER_SESSION_MAX_AGE_MS, isDeveloperSession, issueDeveloperSession } from './developerSession';
import { checkDeveloperProvider, deleteDeveloperProvider, listDeveloperProviders, saveDeveloperProvider } from './developerProviders';
import { removeBackgroundFromProduct, runProductToModelTryOn } from './tryOn';
import {
  createUserMessage,
  getActiveAnnouncement,
  getUserAccess,
  listAnnouncements,
  listDeveloperMessages,
  listPersonalUsers,
  saveAnnouncement,
  setPersonalUserAccess,
  updateUserMessageStatus,
} from './personalWorkspace';

async function assertPersonalUserIsActive(userId: number) {
  const access = await getUserAccess(userId);
  if (!access.exists || access.isDisabled) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'تم إيقاف هذا الحساب من مساحة المشروع الشخصية. تواصل مع المطور إذا كان ذلك غير متوقع.' });
  }
  return access;
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
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
  developer: router({
    login: publicProcedure
      .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
      .mutation(({ ctx, input }) => {
        if (!authenticateDeveloper(input.username, input.password)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "بيانات المطور غير صحيحة" });
        }
        ctx.res.cookie(DEVELOPER_SESSION_COOKIE, issueDeveloperSession(), {
          ...getSessionCookieOptions(ctx.req),
          maxAge: DEVELOPER_SESSION_MAX_AGE_MS,
        });
        return { authenticated: true } as const;
      }),
    status: publicProcedure.query(({ ctx }) => ({ authenticated: isDeveloperSession(ctx.req) })),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(DEVELOPER_SESSION_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
    providers: router({
      list: developerProcedure.query(() => listDeveloperProviders()),
      save: developerProcedure
        .input(z.object({
          id: z.string().uuid().optional(),
          name: z.string().min(1).max(120),
          baseUrl: z.string().url().max(500),
          model: z.string().min(1).max(160),
          apiKey: z.string().min(1).optional(),
          enabled: z.boolean(),
        }))
        .mutation(({ input }) => saveDeveloperProvider(input)),
      check: developerProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ input }) => checkDeveloperProvider(input.id)),
      remove: developerProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ input }) => deleteDeveloperProvider(input.id)),
    }),
    personal: router({
      announcements: developerProcedure.query(() => listAnnouncements()),
      saveAnnouncement: developerProcedure
        .input(z.object({ id: z.number().int().positive().optional(), message: z.string().trim().min(1).max(1200), isActive: z.boolean() }))
        .mutation(({ input }) => saveAnnouncement(input)),
      messages: developerProcedure.query(() => listDeveloperMessages()),
      updateMessageStatus: developerProcedure
        .input(z.object({ id: z.number().int().positive(), status: z.enum(['new', 'read', 'archived']) }))
        .mutation(({ input }) => updateUserMessageStatus(input.id, input.status)),
      users: developerProcedure.query(() => listPersonalUsers()),
      setUserAccess: developerProcedure
        .input(z.object({ id: z.number().int().positive(), isDisabled: z.boolean() }))
        .mutation(({ input }) => setPersonalUserAccess(input.id, input.isDisabled)),
    }),
  }),
  personal: router({
    access: protectedProcedure.query(async ({ ctx }) => assertPersonalUserIsActive(ctx.user.id)),
    announcement: protectedProcedure.query(async ({ ctx }) => {
      await assertPersonalUserIsActive(ctx.user.id);
      return getActiveAnnouncement();
    }),
    sendMessage: protectedProcedure
      .input(z.object({ message: z.string().trim().min(1).max(1200) }))
      .mutation(async ({ ctx, input }) => {
        await assertPersonalUserIsActive(ctx.user.id);
        return createUserMessage({ userId: ctx.user.id, message: input.message });
      }),
  }),
  tryOn: router({
    run: protectedProcedure
      .input(z.object({
        productImageData: z.string().startsWith('data:image/').max(12_000_000),
        aspectRatio: z.enum(['4:5', '9:16']),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertPersonalUserIsActive(ctx.user.id);
        return runProductToModelTryOn(input.productImageData, input.aspectRatio);
      }),
    removeBackground: protectedProcedure
      .input(z.object({ productImageData: z.string().startsWith('data:image/').max(12_000_000) }))
      .mutation(async ({ ctx, input }) => {
        await assertPersonalUserIsActive(ctx.user.id);
        return removeBackgroundFromProduct(input.productImageData);
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;

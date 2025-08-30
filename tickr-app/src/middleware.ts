// src/middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Public routes do NOT require auth.
 * Everything else will be protected automatically by Clerk.
 */
export default clerkMiddleware({
  publicRoutes: ["/", "/sign-in(.*)", "/sign-up(.*)"],
});

/**
 * Run on app & API routes, but skip static files and _next.
 */
export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};

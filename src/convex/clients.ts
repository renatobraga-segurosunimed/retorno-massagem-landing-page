import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx } from "./_generated/server";

const DAY_MS = 24 * 60 * 60 * 1000;

async function requireUserId(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Não autenticado");
  return userId;
}

// ── clients ──────────────────────────────────────────────────────────────

export const listClients = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const createClient = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    focusAreas: v.optional(v.string()),
    notes: v.optional(v.string()),
    preferredOil: v.optional(v.string()),
    pressure: v.optional(v.string()),
    recurrenceDays: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    return await ctx.db.insert("clients", {
      ...args,
      userId,
      // A brand-new client has no session yet; suggest a first return check-in in 7 days
      nextReturnDueAt: now + 7 * DAY_MS,
    });
  },
});

export const updateClient = mutation({
  args: {
    id: v.id("clients"),
    name: v.string(),
    phone: v.optional(v.string()),
    focusAreas: v.optional(v.string()),
    notes: v.optional(v.string()),
    preferredOil: v.optional(v.string()),
    pressure: v.optional(v.string()),
    recurrenceDays: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const { id, ...fields } = args;
    const client = await ctx.db.get(id);
    if (!client || client.userId !== userId) {
      throw new Error("Cliente não encontrado");
    }
    await ctx.db.patch(id, fields);
  },
});

export const deleteClient = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const client = await ctx.db.get(args.id);
    if (!client || client.userId !== userId) {
      throw new Error("Cliente não encontrado");
    }
    // Also remove the client's sessions to keep the history consistent
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_client", (q) => q.eq("clientId", args.id))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }
    await ctx.db.delete(args.id);
  },
});

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

export interface SessionDoc {
  _id: string;
  _creationTime: number;
  userId: string;
  clientId: string;
  performedAt: number;
  technique: string;
  oilUsed?: string;
  durationMinutes: number;
  sessionNotes?: string;
}

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("sessions")
      .withIndex("by_user_performedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const createSession = mutation({
  args: {
    clientId: v.id("clients"),
    performedAt: v.number(),
    technique: v.string(),
    oilUsed: v.optional(v.string()),
    durationMinutes: v.number(),
    sessionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const client = await ctx.db.get(args.clientId);
    if (!client || client.userId !== userId) {
      throw new Error("Cliente não encontrado");
    }
    const sessionId = await ctx.db.insert("sessions", { ...args, userId });
    // Advance the suggested return date based on this session + client cadence
    const nextDue = args.performedAt + client.recurrenceDays * DAY_MS;
    await ctx.db.patch(client._id, { nextReturnDueAt: nextDue });
    return sessionId;
  },
});

export const deleteSession = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      throw new Error("Atendimento não encontrado");
    }
    await ctx.db.delete(args.id);
  },
});

export interface ClientDoc {
  _id: string;
  _creationTime: number;
  userId: string;
  name: string;
  phone?: string;
  focusAreas?: string;
  notes?: string;
  preferredOil?: string;
  pressure?: string;
  recurrenceDays: number;
  nextReturnDueAt: number;
  archived?: boolean;
}

/** Warm dashboard payload: stats + upcoming sessions + overdue/pending returns. */
export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();

    const [clients, sessions] = await Promise.all([
      ctx.db
        .query("clients")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("sessions")
        .withIndex("by_user_performedAt", (q) => q.eq("userId", userId))
        .order("desc")
        .collect(),
    ]);

    const activeClients = clients.filter((c) => !c.archived);
    const activeClientIds = new Set(activeClients.map((c) => c._id));

    const nowMonthStart = new Date();
    nowMonthStart.setDate(1);
    nowMonthStart.setHours(0, 0, 0, 0);
    const monthStart = nowMonthStart.getTime();
    const sessionsThisMonth = sessions.filter(
      (s) => s.performedAt >= monthStart,
    ).length;

    // Return rate: clients with ≥2 sessions / active clients
    const sessionCountByClient = new Map<string, number>();
    for (const s of sessions) {
      if (!activeClientIds.has(s.clientId)) continue;
      sessionCountByClient.set(
        s.clientId,
        (sessionCountByClient.get(s.clientId) ?? 0) + 1,
      );
    }
    const returningClients = [...sessionCountByClient.values()].filter(
      (n) => n >= 2,
    ).length;
    const returnRate =
      activeClients.length === 0
        ? 0
        : Math.round((returningClients / activeClients.length) * 100);

    const upcoming = sessions
      .filter((s) => s.performedAt >= now && activeClientIds.has(s.clientId))
      .slice(0, 6);

    // Overdue = due date already passed; pending = due within 7 days
    const pendingReturns = activeClients
      .filter((c) => c.nextReturnDueAt <= now + 7 * DAY_MS)
      .sort((a, b) => a.nextReturnDueAt - b.nextReturnDueAt)
      .slice(0, 8)
      .map((c) => {
        const lastSession = sessions.find((s) => s.clientId === c._id);
        return {
          client: c,
          lastTechnique: lastSession?.technique,
          daysSinceLast: lastSession
            ? Math.floor((now - lastSession.performedAt) / DAY_MS)
            : null,
        };
      });

    // Sessions per weekday for the current week (Mon–Sun)
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const dow = (weekStart.getDay() + 6) % 7; // Monday = 0
    weekStart.setDate(weekStart.getDate() - dow);
    const weekCounts = Array.from({ length: 5 }, (_, i) => {
      const dayStart = weekStart.getTime() + i * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const count = sessions.filter(
        (s) =>
          s.performedAt >= dayStart &&
          s.performedAt < dayEnd &&
          activeClientIds.has(s.clientId),
      ).length;
      return {
        label: ["SEG", "TER", "QUA", "QUI", "SEX"][i],
        count,
      };
    });

    return {
      stats: {
        activeClients: activeClients.length,
        sessionsThisMonth,
        returnRate,
      },
      weekCounts,
      upcoming,
      pendingReturns,
    };
  },
});

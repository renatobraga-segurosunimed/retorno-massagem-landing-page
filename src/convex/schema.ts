import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ── Retorno Massagem ────────────────────────────────────────────────
    // Clientes do massoterapeuta (scoped to the signed-in professional)
    clients: defineTable({
      userId: v.id("users"),
      name: v.string(),
      phone: v.optional(v.string()),
      focusAreas: v.optional(v.string()),
      notes: v.optional(v.string()),
      preferredOil: v.optional(v.string()),
      pressure: v.optional(v.string()),
      recurrenceDays: v.number(), // suggested interval between sessions
      nextReturnDueAt: v.number(), // suggested date for the next return (epoch ms)
      archived: v.optional(v.boolean()),
    })
      .index("by_user", ["userId"])
      .index("by_user_archived", ["userId", "archived"]),

    // Atendimentos (sessions) — when one is created the client's nextReturnDueAt is advanced
    sessions: defineTable({
      userId: v.id("users"),
      clientId: v.id("clients"),
      performedAt: v.number(), // epoch ms
      technique: v.string(),
      oilUsed: v.optional(v.string()),
      durationMinutes: v.number(),
      sessionNotes: v.optional(v.string()),
    })
      .index("by_user", ["userId"])
      .index("by_user_performedAt", ["userId", "performedAt"])
      .index("by_client", ["clientId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;

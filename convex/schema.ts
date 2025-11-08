import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  timetables: defineTable({
    userId: v.id("users"),
    institutionName: v.string(),
    courseName: v.string(),
    parameters: v.object({
      classrooms: v.number(),
      batches: v.number(),
      subjects: v.number(),
      maxClasses: v.number(),
      frequency: v.number(),
      faculty: v.number(),
      leaveRequests: v.number(),
      algorithm: v.string(),
      startTime: v.string(),
      endTime: v.string(),
      workingDays: v.array(v.string()),
    }),
    timetableData: v.object({
      batches: v.array(v.object({
        id: v.number(),
        name: v.string(),
        schedule: v.any(), // Complex nested object for schedule
      })),
      fitness: v.number(),
      conflicts: v.array(v.any()),
      algorithm: v.string(),
    }),
    generationTime: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  institutions: defineTable({
    name: v.string(),
    courses: v.array(v.object({
      id: v.string(),
      name: v.string(),
      subjects: v.array(v.string()),
      faculty: v.array(v.string()),
    })),
  }),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});

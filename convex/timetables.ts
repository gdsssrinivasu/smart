import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get user's timetables
export const getUserTimetables = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("timetables")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
  },
});

// Get institutions and courses
export const getInstitutions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("institutions").collect();
  },
});

// Save generated timetable
export const saveTimetable = mutation({
  args: {
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
        schedule: v.any(),
      })),
      fitness: v.number(),
      conflicts: v.array(v.any()),
      algorithm: v.string(),
    }),
    generationTime: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to save timetable");
    }

    return await ctx.db.insert("timetables", {
      userId,
      institutionName: args.institutionName,
      courseName: args.courseName,
      parameters: args.parameters,
      timetableData: args.timetableData,
      generationTime: args.generationTime,
      createdAt: Date.now(),
    });
  },
});

// Delete timetable
export const deleteTimetable = mutation({
  args: { timetableId: v.id("timetables") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const timetable = await ctx.db.get(args.timetableId);
    if (!timetable || timetable.userId !== userId) {
      throw new Error("Timetable not found or access denied");
    }

    await ctx.db.delete(args.timetableId);
  },
});

// Initialize sample institutions
export const initializeInstitutions = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("institutions").first();
    if (existing) return; // Already initialized

    const institutions = [
      {
        name: "Ranchi University",
        courses: [
          {
            id: "bsc_cs",
            name: "BSc Computer Science",
            subjects: ["Data Structures", "Algorithms", "Database Systems", "Operating Systems", "Computer Networks", "Software Engineering", "Web Development", "Mobile Computing"],
            faculty: ["Dr. Kumar", "Prof. Sharma", "Dr. Singh", "Prof. Gupta", "Dr. Verma"]
          },
          {
            id: "ba_english",
            name: "BA English",
            subjects: ["English Literature", "Grammar", "Composition", "Linguistics", "Poetry", "Drama", "Creative Writing", "Literary Criticism"],
            faculty: ["Dr. Verma", "Prof. Mishra", "Dr. Jha", "Prof. Pandey"]
          }
        ]
      },
      {
        name: "BIT Sindri",
        courses: [
          {
            id: "btech_cse",
            name: "BTech Computer Science",
            subjects: ["Programming", "Data Structures", "Algorithms", "DBMS", "Computer Networks", "Software Engineering", "Machine Learning", "AI", "Cybersecurity"],
            faculty: ["Dr. Yadav", "Prof. Tiwari", "Dr. Pandey", "Prof. Sinha", "Dr. Rajesh", "Prof. Agarwal"]
          },
          {
            id: "btech_mechanical",
            name: "BTech Mechanical",
            subjects: ["Thermodynamics", "Fluid Mechanics", "Machine Design", "Manufacturing", "CAD", "Heat Transfer", "Materials Science"],
            faculty: ["Dr. Mehta", "Prof. Agarwal", "Dr. Shah", "Prof. Gupta"]
          }
        ]
      },
      {
        name: "Vinoba Bhave University",
        courses: [
          {
            id: "bsc_physics",
            name: "BSc Physics",
            subjects: ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics", "Electronics", "Quantum Physics"],
            faculty: ["Dr. Prasad", "Prof. Chandra", "Dr. Ravi", "Prof. Sharma"]
          }
        ]
      },
      {
        name: "Kolhan University",
        courses: [
          {
            id: "bcom",
            name: "BCom",
            subjects: ["Accounting", "Economics", "Business Law", "Statistics", "Marketing", "Finance"],
            faculty: ["Prof. Agarwal", "Dr. Jain", "Prof. Kapoor"]
          }
        ]
      },
      {
        name: "Sido Kanhu Murmu University",
        courses: [
          {
            id: "ba_history",
            name: "BA History",
            subjects: ["Ancient History", "Medieval History", "Modern History", "World History", "Archaeology", "Political Science"],
            faculty: ["Dr. Tribal", "Prof. Santal", "Dr. Heritage"]
          }
        ]
      },
      {
        name: "Dr. Shyama Prasad Mukherjee University",
        courses: [
          {
            id: "msc_chemistry",
            name: "MSc Chemistry",
            subjects: ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Analytical Chemistry", "Biochemistry", "Environmental Chemistry"],
            faculty: ["Dr. Mukherjee", "Prof. Sen", "Dr. Banerjee"]
          }
        ]
      },
      {
        name: "Nilamber-Pitamber University",
        courses: [
          {
            id: "bca",
            name: "BCA",
            subjects: ["Programming", "Database Management", "Web Development", "Data Structures", "Computer Networks", "Software Engineering"],
            faculty: ["Prof. Tech", "Dr. Code", "Prof. Web"]
          }
        ]
      },
      {
        name: "Binod Bihari Mahto Koylanchal University",
        courses: [
          {
            id: "mining_eng",
            name: "Mining Engineering",
            subjects: ["Mining Methods", "Rock Mechanics", "Mine Safety", "Mineral Processing", "Mine Surveying", "Environmental Mining"],
            faculty: ["Dr. Mining", "Prof. Coal", "Dr. Safety"]
          }
        ]
      }
    ];



    for (const institution of institutions) {
      await ctx.db.insert("institutions", institution);
    }
  },
});

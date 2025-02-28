import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define workout types enum
export const workoutTypes = [
  "Swimming",
  "Boxing",
  "Biking",
  "Rock Climbing",
  "Yoga",
  "Running",
  "Weightlifting",
  "HIIT",
  "Pilates",
  "CrossFit"
] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  targetDistance: integer("target_distance").notNull(), // in kilometers
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  name: text("name").notNull(),
  duration: integer("duration").notNull(), // in minutes
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull(),
  name: text("name").notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps").notNull(),
  weight: integer("weight").notNull(),
});

export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  distance: integer("distance").notNull(), // in kilometers
  date: timestamp("date").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  dateOfBirth: true,
  targetDistance: true,
});

export const insertWorkoutSchema = createInsertSchema(workouts).pick({
  date: true,
  name: true,
  duration: true,
}).extend({
  date: z.coerce.date(),
  name: z.enum(workoutTypes)
});

export const insertExerciseSchema = createInsertSchema(exercises).pick({
  name: true,
  sets: true,
  reps: true,
  weight: true,
});

export const insertRunSchema = createInsertSchema(runs).pick({
  distance: true,
  date: true,
}).extend({
  date: z.coerce.date(),
  distance: z.coerce.number().int().positive()
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type InsertRun = z.infer<typeof insertRunSchema>;
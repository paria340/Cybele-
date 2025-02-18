import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  name: text("name").notNull(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull(),
  name: text("name").notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps").notNull(),
  weight: integer("weight").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWorkoutSchema = createInsertSchema(workouts).pick({
  date: true,
  name: true,
});

export const insertExerciseSchema = createInsertSchema(exercises).pick({
  name: true,
  sets: true,
  reps: true,
  weight: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;

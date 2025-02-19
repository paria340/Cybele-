import { User, InsertUser, Workout, Exercise, InsertWorkout, InsertExercise, Run, InsertRun } from "@shared/schema";
import { users, workouts, exercises, runs } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createWorkout(userId: number, workout: InsertWorkout): Promise<Workout>;
  getWorkouts(userId: number): Promise<Workout[]>;
  getWorkoutsForDay(userId: number, startDate: Date, endDate: Date): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  deleteWorkout(id: number): Promise<void>;

  createExercise(workoutId: number, exercise: InsertExercise): Promise<Exercise>;
  getExercises(workoutId: number): Promise<Exercise[]>;

  createRun(userId: number, run: InsertRun): Promise<Run>;
  getRuns(userId: number, startDate: Date, endDate: Date): Promise<Run[]>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createWorkout(userId: number, workout: InsertWorkout): Promise<Workout> {
    const [newWorkout] = await db
      .insert(workouts)
      .values({ ...workout, userId })
      .returning();
    return newWorkout;
  }

  async getWorkouts(userId: number): Promise<Workout[]> {
    return await db.select().from(workouts).where(eq(workouts.userId, userId));
  }

  async getWorkoutsForDay(userId: number, startDate: Date, endDate: Date): Promise<Workout[]> {
    console.log("Fetching workouts for user:", userId, "between:", startDate, "and:", endDate);
    const results = await db
      .select()
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.date, startDate),
          lte(workouts.date, endDate)
        )
      );
    console.log("Found workouts:", results);
    return results;
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout;
  }

  async deleteWorkout(id: number): Promise<void> {
    await db.delete(exercises).where(eq(exercises.workoutId, id));
    await db.delete(workouts).where(eq(workouts.id, id));
  }

  async createExercise(workoutId: number, exercise: InsertExercise): Promise<Exercise> {
    const [newExercise] = await db
      .insert(exercises)
      .values({ ...exercise, workoutId })
      .returning();
    return newExercise;
  }

  async getExercises(workoutId: number): Promise<Exercise[]> {
    return await db.select().from(exercises).where(eq(exercises.workoutId, workoutId));
  }

  async createRun(userId: number, run: InsertRun): Promise<Run> {
    console.log("Creating run with data:", { userId, run });
    const [newRun] = await db
      .insert(runs)
      .values({ ...run, userId })
      .returning();
    console.log("Created run:", newRun);
    return newRun;
  }

  async getRuns(userId: number, startDate: Date, endDate: Date): Promise<Run[]> {
    console.log("Fetching runs for user:", userId, "between:", startDate, "and:", endDate);
    const results = await db
      .select()
      .from(runs)
      .where(
        and(
          eq(runs.userId, userId),
          gte(runs.date, startDate),
          lte(runs.date, endDate)
        )
      );
    console.log("Found runs:", results);
    return results;
  }
}

export const storage = new DatabaseStorage();
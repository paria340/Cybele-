import { User, InsertUser, Workout, Exercise, InsertWorkout, InsertExercise } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createWorkout(userId: number, workout: InsertWorkout): Promise<Workout>;
  getWorkouts(userId: number): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  
  createExercise(workoutId: number, exercise: InsertExercise): Promise<Exercise>;
  getExercises(workoutId: number): Promise<Exercise[]>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workouts: Map<number, Workout>;
  private exercises: Map<number, Exercise>;
  private currentId: { user: number; workout: number; exercise: number };
  readonly sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.workouts = new Map();
    this.exercises = new Map();
    this.currentId = { user: 1, workout: 1, exercise: 1 };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.user++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createWorkout(userId: number, workout: InsertWorkout): Promise<Workout> {
    const id = this.currentId.workout++;
    const newWorkout = { ...workout, id, userId };
    this.workouts.set(id, newWorkout);
    return newWorkout;
  }

  async getWorkouts(userId: number): Promise<Workout[]> {
    return Array.from(this.workouts.values()).filter(
      (workout) => workout.userId === userId,
    );
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    return this.workouts.get(id);
  }

  async createExercise(workoutId: number, exercise: InsertExercise): Promise<Exercise> {
    const id = this.currentId.exercise++;
    const newExercise = { ...exercise, id, workoutId };
    this.exercises.set(id, newExercise);
    return newExercise;
  }

  async getExercises(workoutId: number): Promise<Exercise[]> {
    return Array.from(this.exercises.values()).filter(
      (exercise) => exercise.workoutId === workoutId,
    );
  }
}

export const storage = new MemStorage();

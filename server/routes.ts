import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertWorkoutSchema, insertExerciseSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Workout routes
  app.post("/api/workouts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const workout = insertWorkoutSchema.parse(req.body);
    const newWorkout = await storage.createWorkout(req.user.id, workout);
    res.status(201).json(newWorkout);
  });

  app.get("/api/workouts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const workouts = await storage.getWorkouts(req.user.id);
    res.json(workouts);
  });

  // Exercise routes
  app.post("/api/workouts/:workoutId/exercises", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const workoutId = parseInt(req.params.workoutId);
    const workout = await storage.getWorkout(workoutId);
    
    if (!workout || workout.userId !== req.user.id) {
      return res.sendStatus(404);
    }
    
    const exercise = insertExerciseSchema.parse(req.body);
    const newExercise = await storage.createExercise(workoutId, exercise);
    res.status(201).json(newExercise);
  });

  app.get("/api/workouts/:workoutId/exercises", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const workoutId = parseInt(req.params.workoutId);
    const workout = await storage.getWorkout(workoutId);
    
    if (!workout || workout.userId !== req.user.id) {
      return res.sendStatus(404);
    }
    
    const exercises = await storage.getExercises(workoutId);
    res.json(exercises);
  });

  const httpServer = createServer(app);
  return httpServer;
}

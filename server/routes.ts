import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertWorkoutSchema, insertExerciseSchema, insertRunSchema } from "@shared/schema";
import { startOfWeek, endOfWeek, parseISO } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.post("/api/workouts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const workout = insertWorkoutSchema.parse(req.body);
      const newWorkout = await storage.createWorkout(req.user.id, workout);
      res.status(201).json(newWorkout);
    } catch (error) {
      console.error("Error creating workout:", error);
      res.status(400).json({ error: "Invalid workout data" });
    }
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

  // Run routes
  app.post("/api/runs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const run = insertRunSchema.parse(req.body);
    const newRun = await storage.createRun(req.user.id, run);
    res.status(201).json(newRun);
  });

  app.get("/api/runs/week", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const now = new Date();
    const start = startOfWeek(now);
    const end = endOfWeek(now);

    try {
      const runs = await storage.getRuns(req.user.id, start, end);
      // Ensure proper number calculation for total distance
      const totalDistance = runs.reduce((sum, run) => {
        const distance = typeof run.distance === 'number' ? run.distance : 0;
        return sum + distance;
      }, 0);

      res.json({
        runs,
        totalDistance,
        startDate: start,
        endDate: end
      });
    } catch (error) {
      console.error("Error fetching weekly runs:", error);
      res.status(500).json({ error: "Failed to fetch weekly runs" });
    }
  });

  app.delete("/api/workouts/:workoutId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const workoutId = parseInt(req.params.workoutId);
    const workout = await storage.getWorkout(workoutId);

    if (!workout || workout.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    await storage.deleteWorkout(workoutId);
    res.sendStatus(200);
  });

  const httpServer = createServer(app);
  return httpServer;
}
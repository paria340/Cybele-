import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertWorkoutSchema, insertExerciseSchema, insertRunSchema } from "@shared/schema";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.post("/api/runs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      console.log("Received run data:", req.body);
      const run = insertRunSchema.parse(req.body);
      console.log("Parsed run data:", run);
      const newRun = await storage.createRun(req.user.id, run);
      console.log("Created new run:", newRun);
      res.status(201).json(newRun);
    } catch (error) {
      console.error("Error creating run:", error);
      res.status(400).json({ error: "Invalid run data" });
    }
  });

  app.get("/api/runs/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const now = new Date();

    // Calculate date ranges
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    try {
      // Fetch runs for different time periods
      const [weeklyRuns, monthlyRuns, yearlyRuns] = await Promise.all([
        storage.getRuns(req.user.id, weekStart, weekEnd),
        storage.getRuns(req.user.id, monthStart, monthEnd),
        storage.getRuns(req.user.id, yearStart, yearEnd)
      ]);

      // Calculate statistics
      const stats = {
        weekly: {
          runs: weeklyRuns,
          totalDistance: weeklyRuns.reduce((sum, run) => sum + (typeof run.distance === 'number' ? run.distance : 0), 0),
          startDate: weekStart,
          endDate: weekEnd
        },
        monthly: {
          runs: monthlyRuns,
          totalDistance: monthlyRuns.reduce((sum, run) => sum + (typeof run.distance === 'number' ? run.distance : 0), 0),
          startDate: monthStart,
          endDate: monthEnd
        },
        yearly: {
          runs: yearlyRuns,
          totalDistance: yearlyRuns.reduce((sum, run) => sum + (typeof run.distance === 'number' ? run.distance : 0), 0),
          startDate: yearStart,
          endDate: yearEnd
        }
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching running statistics:", error);
      res.status(500).json({ error: "Failed to fetch running statistics" });
    }
  });

  // Keep existing routes
  app.get("/api/runs/week", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const now = new Date();
    const start = startOfWeek(now);
    const end = endOfWeek(now);

    try {
      const runs = await storage.getRuns(req.user.id, start, end);
      console.log("Weekly runs:", runs);

      const totalDistance = runs.reduce((sum, run) => {
        const distance = typeof run.distance === 'number' ? run.distance : 0;
        return sum + distance;
      }, 0);

      console.log("Calculated total distance:", totalDistance);

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

  // Keep other existing routes
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

    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    try {
      const workouts = await storage.getWorkoutsForDay(req.user.id, start, end);
      res.json(workouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      res.status(500).json({ error: "Failed to fetch workouts" });
    }
  });

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
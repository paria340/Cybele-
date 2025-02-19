import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWorkoutSchema, insertExerciseSchema, insertRunSchema, type InsertWorkout, type InsertExercise, type Workout, type Exercise, type Run } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut, Plus, DumbbellIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [date] = useState(new Date());

  // Workouts Query
  const { data: workouts, isLoading: isLoadingWorkouts } = useQuery({
    queryKey: ["/api/workouts"],
    queryFn: async () => {
      const response = await apiRequest("/api/workouts", { method: "GET" });
      return response.json();
    }
  });

  // Weekly Running Stats Query
  const { data: weeklyStats, isLoading: isLoadingStats } = useQuery<WeeklyStats>({
    queryKey: ["/api/runs/week"],
    queryFn: async () => {
      const response = await apiRequest("/api/runs/week", { 
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });
      return response.json();
    },
  });

  // Forms
  const workoutForm = useForm<InsertWorkout>({
    resolver: zodResolver(insertWorkoutSchema),
    defaultValues: {
      name: "",
      date: new Date(),
    },
  });

  const exerciseForm = useForm<InsertExercise>({
    resolver: zodResolver(insertExerciseSchema),
    defaultValues: {
      name: "",
      sets: 3,
      reps: 10,
      weight: 0,
    },
  });

  const runForm = useForm({
    resolver: zodResolver(insertRunSchema),
    defaultValues: {
      distance: 0,
      date: new Date().toISOString(),
    },
  });

  // Mutations
  const createWorkoutMutation = useMutation({
    mutationFn: async (data: InsertWorkout) => {
      const res = await apiRequest("/api/workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          date: format(data.date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts"] });
      toast({
        title: "Workout created successfully!",
        description: "Your new workout has been added.",
      });
      workoutForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error creating workout",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const createExerciseMutation = useMutation({
    mutationFn: async ({ workoutId, exercise }: { workoutId: number; exercise: InsertExercise }) => {
      const res = await apiRequest(`/api/workouts/${workoutId}/exercises`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exercise),
      });
      return res.json();
    },
    onSuccess: (_, { workoutId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/workouts/${workoutId}/exercises`] });
      toast({
        title: "Exercise added successfully!",
        description: "Your new exercise has been added to the workout.",
      });
    },
  });

  const addRunMutation = useMutation({
    mutationFn: async (data: { distance: number; date: string }) => {
      const response = await apiRequest("/api/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs/week"] });
      toast({
        title: "Run added successfully!",
        description: "Your running progress has been updated.",
      });
      runForm.reset();
    },
    onError: () => {
      toast({
        title: "Error adding run",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitWorkout = workoutForm.handleSubmit((data) => {
    createWorkoutMutation.mutate(data);
  });

  const onSubmitExercise = async (workoutId: number) => {
    const data = exerciseForm.getValues();
    await createExerciseMutation.mutateAsync({ workoutId, exercise: data });
    exerciseForm.reset();
  };

  const onSubmitRun = runForm.handleSubmit((data) => {
    addRunMutation.mutate(data);
  });

  if (isLoadingWorkouts || isLoadingStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DumbbellIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Cybele</h1>
          </div>
          <div className="flex items-center gap-4">
            <span>Welcome, {user?.username}</span>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Workouts Section */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Your Workouts</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Workout
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Workout</DialogTitle>
                  </DialogHeader>
                  <Form {...workoutForm}>
                    <form onSubmit={onSubmitWorkout} className="space-y-4">
                      <FormField
                        control={workoutForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Workout Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter workout name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full">
                        Create Workout
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {workouts?.map((workout: Workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onAddExercise={onSubmitExercise}
                  exerciseForm={exerciseForm}
                />
              ))}
            </div>
          </div>

          {/* Running Progress Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Weekly Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Progress</CardTitle>
                <CardDescription>Your running stats for this week</CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyStats ? (
                  <div className="grid gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Distance</p>
                      <p className="text-2xl font-bold">{weeklyStats.totalDistance} km</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Week Range</p>
                      <p className="text-muted-foreground">
                        {format(new Date(weeklyStats.startDate), 'MMM d')} - {format(new Date(weeklyStats.endDate), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p>No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Add Run Form */}
            <Card>
              <CardHeader>
                <CardTitle>Log Today's Run</CardTitle>
                <CardDescription>Enter the distance you've run</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...runForm}>
                  <form onSubmit={onSubmitRun} className="space-y-4">
                    <FormField
                      control={runForm.control}
                      name="distance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Distance (km)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Enter distance in kilometers"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={addRunMutation.isPending}
                    >
                      {addRunMutation.isPending ? "Saving..." : "Log Run"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// WorkoutCard component remains unchanged
interface WorkoutCardProps {
  workout: Workout;
  onAddExercise: (workoutId: number) => Promise<void>;
  exerciseForm: any;
}

function WorkoutCard({ workout, onAddExercise, exerciseForm }: WorkoutCardProps) {
  const { data: exercises } = useQuery({
    queryKey: [`/api/workouts/${workout.id}/exercises`],
    queryFn: async () => {
      const response = await apiRequest(`/api/workouts/${workout.id}/exercises`, { method: "GET" });
      return response.json();
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{workout.name}</CardTitle>
        <div className="text-sm text-muted-foreground">
          {format(new Date(workout.date), "PPP")}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {exercises?.map((exercise: Exercise) => (
            <div
              key={exercise.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div>
                <div className="font-medium">{exercise.name}</div>
                <div className="text-sm text-muted-foreground">
                  {exercise.sets} sets × {exercise.reps} reps @ {exercise.weight}kg
                </div>
              </div>
            </div>
          ))}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Exercise</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                onAddExercise(workout.id);
              }} className="space-y-4">
                <div>
                  <Label htmlFor="exercise-name">Exercise Name</Label>
                  <Input id="exercise-name" {...exerciseForm.register("name")} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="sets">Sets</Label>
                    <Input
                      id="sets"
                      type="number"
                      {...exerciseForm.register("sets", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reps">Reps</Label>
                    <Input
                      id="reps"
                      type="number"
                      {...exerciseForm.register("reps", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      {...exerciseForm.register("weight", { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Add Exercise
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
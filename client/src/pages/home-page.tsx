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
import { LogOut, Plus, DumbbellIcon, Loader2, Trash as TrashIcon } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { workoutTypes } from "@shared/schema";

interface RunningStats {
  runs: Array<{ distance: number; duration: number; date: string }>;
  totalDistance: number;
  startDate: string;
  endDate: string;
}

interface AllStats {
  weekly: RunningStats;
  monthly: RunningStats;
  yearly: RunningStats;
}

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [date] = useState(new Date());
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);

  // Workouts Query
  const { data: workouts, isLoading: isLoadingWorkouts } = useQuery({
    queryKey: ["/api/workouts"],
    queryFn: async () => {
      const response = await apiRequest("/api/workouts", { method: "GET" });
      return response.json();
    }
  });

  // Replace the weekly stats query with the new comprehensive stats query
  const { data: runningStats, isLoading: isLoadingStats } = useQuery<AllStats>({
    queryKey: ["/api/runs/stats"],
    queryFn: async () => {
      const response = await apiRequest("/api/runs/stats", {
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
      date: new Date(), // Set today's date as default
      duration: 30,
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
      duration: 0, // Added duration field
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
          ...data,
          date: new Date().toISOString(), // Ensure we're using today's date
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
      setWorkoutDialogOpen(false);
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
    mutationFn: async (data: { distance: number; duration: number; date: string }) => {
      if (isNaN(data.distance) || data.distance <= 0) {
        throw new Error("Distance must be greater than 0");
      }
      if (isNaN(data.duration) || data.duration <= 0) {
        throw new Error("Duration must be greater than 0");
      }

      const response = await apiRequest("/api/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          distance: Math.round(data.distance),
          duration: Math.round(data.duration),
          date: new Date().toISOString(),
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs/stats"] });
      toast({
        title: "Run added successfully!",
        description: "Your running progress has been updated.",
      });
      runForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding run",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      await apiRequest(`/api/workouts/${workoutId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts"] });
      toast({
        title: "Workout deleted",
        description: "Your workout has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting workout",
        description: error.message || "Please try again.",
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
    addRunMutation.mutate({...data, date: new Date().toISOString()}); //Added date to data
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
              <div>
                <h2 className="text-3xl font-bold">Today's Workouts</h2>
                <p className="text-muted-foreground mt-1">
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <Dialog open={workoutDialogOpen} onOpenChange={setWorkoutDialogOpen}>
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
                            <FormLabel>Workout Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a workout type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {workoutTypes.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={workoutForm.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="Enter workout duration"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
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

            {workouts?.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent>
                  <p className="text-muted-foreground mb-4">No workouts scheduled for today</p>
                  <Dialog open={workoutDialogOpen} onOpenChange={setWorkoutDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule a Workout
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
                                <FormLabel>Workout Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a workout type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {workoutTypes.map((type) => (
                                      <SelectItem key={type} value={type}>
                                        {type}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={workoutForm.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duration (minutes)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="Enter workout duration"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
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
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                {workouts?.map((workout: Workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    onAddExercise={onSubmitExercise}
                    onDelete={() => deleteWorkoutMutation.mutate(workout.id)}
                    exerciseForm={exerciseForm}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Running Progress Section */}
          <div className="grid gap-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Weekly Statistics - Larger card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Weekly Progress</CardTitle>
                  <CardDescription>Your running stats for this week</CardDescription>
                </CardHeader>
                <CardContent>
                  {runningStats?.weekly ? (
                    <div className="grid gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Distance</p>
                        <p className="text-4xl font-bold">{runningStats.weekly.totalDistance} km</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Average Pace</p>
                        <p className="text-2xl font-semibold">
                          {runningStats.weekly.runs.length > 0
                            ? (
                                runningStats.weekly.runs.reduce((acc, run) => acc + (run.duration / run.distance), 0) /
                                runningStats.weekly.runs.length
                              ).toFixed(2)
                            : "0"} min/km
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Week Range</p>
                        <p className="text-muted-foreground">
                          {format(new Date(runningStats.weekly.startDate), 'MMM d')} - {format(new Date(runningStats.weekly.endDate), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p>No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Monthly and Yearly Statistics - Smaller cards in a column */}
              <div className="space-y-6">
                {/* Monthly Statistics */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Monthly Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {runningStats?.monthly ? (
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Distance</p>
                          <p className="text-2xl font-bold">{runningStats.monthly.totalDistance} km</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(runningStats.monthly.startDate), 'MMMM yyyy')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p>No data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Yearly Statistics */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Yearly Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {runningStats?.yearly ? (
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Distance</p>
                          <p className="text-2xl font-bold">{runningStats.yearly.totalDistance} km</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(runningStats.yearly.startDate), 'yyyy')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p>No data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Add Run Form */}
            <Card>
              <CardHeader>
                <CardTitle>Log Today's Run</CardTitle>
                <CardDescription>Enter the distance you've run</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...runForm}>
                  <form onSubmit={onSubmitRun} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={runForm.control}
                        name="distance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Distance (km)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                min="1"
                                placeholder="Enter distance in kilometers"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value ? parseInt(e.target.value) : 0;
                                  field.onChange(value);
                                }}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={runForm.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                min="1"
                                placeholder="Enter duration in minutes"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value ? parseInt(e.target.value) : 0;
                                  field.onChange(value);
                                }}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pace: {
                        (runForm.watch("distance") && runForm.watch("duration"))
                          ? (runForm.watch("duration") / runForm.watch("distance")).toFixed(2)
                          : "0.00"
                      } min/km
                    </div>
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

// WorkoutCard component
interface WorkoutCardProps {
  workout: Workout;
  onAddExercise: (workoutId: number) => Promise<void>;
  onDelete: () => void;
  exerciseForm: any;
}

function WorkoutCard({ workout, onAddExercise, onDelete, exerciseForm }: WorkoutCardProps) {
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
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{workout.name}</CardTitle>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>{format(new Date(workout.date), "PPP")}</div>
              <div>{workout.duration} minutes</div>
            </div>
          </div>
          <Button
            variant="destructive"
            size="icon"
            onClick={onDelete}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
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
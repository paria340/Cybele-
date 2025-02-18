import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWorkoutSchema, insertExerciseSchema, type InsertWorkout, type InsertExercise } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut, Plus, DumbbellIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { data: workouts, isLoading: isLoadingWorkouts } = useQuery({
    queryKey: ["/api/workouts"],
  });

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

  const createWorkoutMutation = useMutation({
    mutationFn: async (data: InsertWorkout) => {
      const res = await apiRequest("POST", "/api/workouts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts"] });
    },
  });

  const createExerciseMutation = useMutation({
    mutationFn: async ({ workoutId, exercise }: { workoutId: number; exercise: InsertExercise }) => {
      const res = await apiRequest("POST", `/api/workouts/${workoutId}/exercises`, exercise);
      return res.json();
    },
    onSuccess: (_, { workoutId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/workouts/${workoutId}/exercises`] });
    },
  });

  const onSubmitWorkout = async (data: InsertWorkout) => {
    await createWorkoutMutation.mutateAsync(data);
    workoutForm.reset();
  };

  const onSubmitExercise = async (workoutId: number) => {
    const data = exerciseForm.getValues();
    await createExerciseMutation.mutateAsync({ workoutId, exercise: data });
    exerciseForm.reset();
  };

  if (isLoadingWorkouts) {
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
              <form onSubmit={workoutForm.handleSubmit(onSubmitWorkout)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Workout Name</Label>
                  <Input id="name" {...workoutForm.register("name")} />
                </div>
                <Button type="submit" className="w-full">
                  Create Workout
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workouts?.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onAddExercise={onSubmitExercise}
              exerciseForm={exerciseForm}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function WorkoutCard({ workout, onAddExercise, exerciseForm }) {
  const { data: exercises } = useQuery({
    queryKey: [`/api/workouts/${workout.id}/exercises`],
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
          {exercises?.map((exercise) => (
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

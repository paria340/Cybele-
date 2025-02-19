import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { insertRunSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface WeeklyStats {
  runs: Array<{ distance: number; date: string }>;
  totalDistance: number;
  startDate: string;
  endDate: string;
}

export default function RunsPage() {
  const { toast } = useToast();
  const [date] = useState(new Date());

  const form = useForm({
    resolver: zodResolver(insertRunSchema),
    defaultValues: {
      distance: 0,
      date: new Date().toISOString(),
    },
  });

  const weeklyStats = useQuery<WeeklyStats>({
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

  const addRun = useMutation({
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
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error adding run",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    addRun.mutate(data);
  });

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Running Tracker</h1>

      <div className="grid gap-6">
        {/* Weekly Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
            <CardDescription>Your running stats for this week</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyStats.isLoading ? (
              <p>Loading stats...</p>
            ) : weeklyStats.data ? (
              <div className="grid gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Distance</p>
                  <p className="text-2xl font-bold">{weeklyStats.data.totalDistance} km</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Week Range</p>
                  <p className="text-muted-foreground">
                    {format(new Date(weeklyStats.data.startDate), 'MMM d')} - {format(new Date(weeklyStats.data.endDate), 'MMM d')}
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
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
                <FormField
                  control={form.control}
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
                  disabled={addRun.isPending}
                >
                  {addRun.isPending ? "Saving..." : "Log Run"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
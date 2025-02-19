import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { insertRunSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

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
        body: JSON.stringify({
          ...data,
          distance: Math.round(data.distance), // Ensure distance is an integer
        }),
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
    if (isNaN(data.distance) || data.distance <= 0) {
      toast({
        title: "Invalid distance",
        description: "Please enter a valid distance greater than 0.",
        variant: "destructive",
      });
      return;
    }
    addRun.mutate(data);
  });

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Running Tracker</h1>
      </div>

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
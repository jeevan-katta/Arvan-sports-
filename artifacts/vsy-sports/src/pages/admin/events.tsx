import { useState } from "react";
import { useListEvents, useCreateEvent, useDeleteEvent } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Plus, Trash2, MapPin } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListEventsQueryKey } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

const eventSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  date: z.string(),
  time: z.string(),
  venue: z.string(),
  area: z.string(),
  prize: z.string(),
  entryFee: z.coerce.number(),
  maxParticipants: z.coerce.number(),
  featured: z.boolean().default(false),
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function AdminEvents() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: events, isLoading } = useListEvents();
  const createMutation = useCreateEvent();
  const deleteMutation = useDeleteEvent();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      time: "",
      venue: "",
      area: "",
      prize: "",
      entryFee: 0,
      maxParticipants: 16,
      featured: false,
    },
  });

  const onSubmit = (data: EventFormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Event created successfully" });
        setIsDialogOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this event?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Event deleted" });
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        }
      });
    }
  };

  if (isLoading) return <div className="p-8">Loading events...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Events Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold"><Plus className="h-4 w-4 mr-2" /> Create Event</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tournament</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="time" render={({ field }) => (
                    <FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="venue" render={({ field }) => (
                    <FormItem><FormLabel>Venue</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="area" render={({ field }) => (
                    <FormItem><FormLabel>Area</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="prize" render={({ field }) => (
                    <FormItem><FormLabel>Prize</FormLabel><FormControl><Input placeholder="e.g. ₹50,000" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="entryFee" render={({ field }) => (
                    <FormItem><FormLabel>Entry Fee (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="maxParticipants" render={({ field }) => (
                  <FormItem><FormLabel>Max Teams/Participants</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="featured" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Featured Event</FormLabel>
                      <p className="text-[10px] text-muted-foreground">Show at the top of the events page</p>
                    </div>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>Create Event</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {events?.map((event) => (
          <Card key={event.id} className="border-border shadow-sm overflow-hidden flex flex-col relative">
            {event.featured && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-1 text-[10px] font-bold rounded-bl-lg z-10">
                FEATURED
              </div>
            )}
            <CardHeader className="p-4 bg-muted/20 border-b border-border pb-3">
              <CardTitle className="text-lg font-bold pr-16 leading-tight">{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex items-center"><CalendarIcon className="h-4 w-4 mr-2 text-primary" /> {event.date} • {event.time}</div>
                <div className="flex items-center"><MapPin className="h-4 w-4 mr-2 text-primary" /> {event.venue}, {event.area}</div>
                <div className="flex justify-between items-center bg-muted/30 p-2 rounded border border-border mt-3">
                  <span className="font-bold text-foreground">Entry: ₹{event.entryFee}</span>
                  <span className="font-bold text-primary">Win: {event.prize}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <div className="text-xs font-medium">
                  {event.currentParticipants}/{event.maxParticipants} Registered
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(event.id)} className="h-8">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
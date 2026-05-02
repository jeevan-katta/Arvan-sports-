import { useState } from "react";
import { useListEvents, useCreateEvent, useDeleteEvent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Plus, Trash2, MapPin, Trophy, Users, IndianRupee } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListEventsQueryKey } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
    defaultValues: { title: "", description: "", date: "", time: "", venue: "", area: "", prize: "", entryFee: 0, maxParticipants: 16, featured: false },
  });

  const onSubmit = (data: EventFormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Event created!" });
        setIsDialogOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
      },
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this event?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Event deleted" });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
      },
    });
  };

  return (
    <div className="p-4 md:p-8 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Events Management</h2>
          <p className="text-white/40 text-sm mt-0.5">{events?.length || 0} events created</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-bold bg-primary hover:bg-primary/90 rounded-xl h-10 px-5">
              <Plus className="h-4 w-4" /> Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto bg-[#1a1d27] border-white/10 text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" /> Create Tournament
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/60 text-xs">Event Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="VSY Box Cricket Championship 2026" className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/60 text-xs">Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-white/5 border-white/10 text-white" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="time" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/60 text-xs">Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="bg-white/5 border-white/10 text-white" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="venue" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/60 text-xs">Venue</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="VSY Box Cricket" className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="area" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/60 text-xs">Area</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Gachibowli" className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="prize" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/60 text-xs">Prize</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="₹50,000" className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="entryFee" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/60 text-xs">Entry Fee (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-white/5 border-white/10 text-white" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="maxParticipants" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/60 text-xs">Max Teams</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-white/5 border-white/10 text-white" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/60 text-xs">Description (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Rules, format, contact info..." className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="featured" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-white/10 bg-white/5 p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="text-white text-sm font-bold">Feature this event</FormLabel>
                      <p className="text-[11px] text-white/30 mt-0.5">Displayed prominently at the top of the events page</p>
                    </div>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full font-bold h-11 bg-primary hover:bg-primary/90" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-56 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : events?.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <Trophy className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-bold text-lg">No events yet</p>
          <p className="text-sm mt-1 mb-5">Create your first tournament to engage the community</p>
          <Button onClick={() => setIsDialogOpen(true)} className="font-bold gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Create Event
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events?.map((event: any) => (
            <div key={event.id} className={cn(
              "bg-white/5 border rounded-2xl overflow-hidden relative flex flex-col",
              event.featured ? "border-primary/40 bg-primary/5" : "border-white/10"
            )}>
              {event.featured && (
                <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[9px] font-black uppercase px-2 py-1 rounded-full tracking-wider">
                  Featured
                </div>
              )}
              <div className="p-5 flex-1">
                <h3 className="font-bold text-white text-base leading-tight pr-16 mb-3">{event.title}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-white/50">
                    <CalendarIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>{event.date} at {event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/50">
                    <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>{event.venue}, {event.area}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/50">
                    <Users className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>{event.currentParticipants || 0} / {event.maxParticipants} registered</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-white/30 font-bold uppercase">Entry</p>
                    <p className="font-black text-primary mt-0.5">₹{event.entryFee}</p>
                  </div>
                  <div className="flex-1 bg-amber-500/10 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-amber-400/60 font-bold uppercase">Prize</p>
                    <p className="font-black text-amber-400 mt-0.5 text-sm truncate">{event.prize}</p>
                  </div>
                </div>
                {/* Participation progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-white/30 mb-1">
                    <span>Registrations</span>
                    <span>{event.maxParticipants > 0 ? Math.round(((event.currentParticipants || 0) / event.maxParticipants) * 100) : 0}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${event.maxParticipants > 0 ? Math.min(100, ((event.currentParticipants || 0) / event.maxParticipants) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 p-4 flex justify-end">
                <Button
                  variant="ghost" size="sm"
                  className="h-8 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-lg gap-1.5"
                  onClick={() => handleDelete(event.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Event
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

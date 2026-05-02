import { useState } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { useListPosts, useCreatePost } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Clock, Users, Plus, MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListPostsQueryKey } from "@workspace/api-client-react";
import { LiveScoresWidget } from "@/components/LiveScoresWidget";

const postSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  playersNeeded: z.coerce.number().min(1, "Need at least 1 player"),
  matchDate: z.string().min(1, "Date is required"),
  matchTime: z.string().min(1, "Time is required"),
  turfName: z.string().optional(),
  area: z.string().min(2, "Area is required"),
});

type PostFormValues = z.infer<typeof postSchema>;

export default function Community() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: posts, isLoading } = useListPosts({
    status: "open"
  });

  const createPostMutation = useCreatePost();

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      description: "",
      playersNeeded: 1,
      matchDate: format(new Date(), "yyyy-MM-dd"),
      matchTime: "18:00",
      turfName: "",
      area: "",
    },
  });

  const onSubmit = (data: PostFormValues) => {
    createPostMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Post created successfully!" });
        setIsDialogOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Failed to create post",
          description: error.message
        });
      }
    });
  };

  return (
    <div className="flex flex-col min-h-full relative pb-20">
      <Header title="Community" showLocation={false} />
      
      <LiveScoresWidget />

      <div className="p-4 bg-background sticky top-14 z-30 border-b border-border flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">Find Players</h2>
          <p className="text-xs text-muted-foreground">Join matches in your area</p>
        </div>
      </div>

      <main className="flex-1 p-4 space-y-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))
        ) : posts?.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <h3 className="font-bold text-lg">No open matches</h3>
            <p className="text-muted-foreground text-sm">Be the first to create a post and invite players!</p>
          </div>
        ) : (
          posts?.map(post => (
            <Link key={post.id} href={`/community/${post.id}`} className="block group">
                <Card className="border-border shadow-sm hover:border-primary/50 transition-colors overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={post.userAvatar} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {post.userName?.substring(0, 2).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-sm leading-tight">{post.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Posted by {post.userName}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-none font-bold">
                        Need {post.playersNeeded}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-3 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 mr-2 text-primary" />
                        <span className="truncate">{post.matchDate ? format(parseISO(post.matchDate), "MMM dd, yyyy") : 'TBD'}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 mr-2 text-primary" />
                        <span className="truncate">{post.matchTime || 'TBD'}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground col-span-2">
                        <MapPin className="h-3.5 w-3.5 mr-2 text-primary" />
                        <span className="truncate">{post.turfName ? `${post.turfName}, ` : ''}{post.area}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center text-xs font-medium text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                        Discuss details
                      </div>
                      <Button size="sm" className="h-8 rounded-lg px-4 text-xs font-bold">View / Join</Button>
                    </div>
                  </div>
                </Card>
            </Link>
          ))
        )}
      </main>

      {/* Floating Action Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg shadow-primary/30 p-0 z-40"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Looking for players?</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Need 2 players for Saturday match" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="playersNeeded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Players Needed</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area / Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Gachibowli" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="matchDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="matchTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="turfName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turf Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="If already booked..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any skill level requirements? Split cost?" 
                        className="resize-none h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full font-bold" disabled={createPostMutation.isPending}>
                {createPostMutation.isPending ? "Creating..." : "Create Post"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
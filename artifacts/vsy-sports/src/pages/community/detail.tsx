import { useState } from "react";
import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import {
  useGetPost,
  useGetPostMessages,
  useSendPostMessage,
  useJoinPost,
  useGetMe,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, MapPin, Calendar, Clock, Send, Users,
  MessageSquare, Phone, CheckCircle2, UserPlus,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPostMessagesQueryKey, getGetPostQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type Tab = "info" | "chat";

export default function PostDetail() {
  const { id } = useParams();
  const postId = id || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("info");
  const [message, setMessage] = useState("");

  const { data: user } = useGetMe({ query: { retry: false } });
  const { data: post, isLoading: isLoadingPost } = useGetPost(postId, { query: { enabled: !!postId } });
  const { data: messages, isLoading: isLoadingMessages } = useGetPostMessages(postId, { query: { enabled: !!postId } });

  const joinPostMutation = useJoinPost();
  const sendMessageMutation = useSendPostMessage();

  const handleJoin = () => {
    if (!user) {
      toast({ title: "Login required", description: "Please login to join matches" }); return;
    }
    joinPostMutation.mutate({ id: postId }, {
      onSuccess: () => {
        toast({ title: "Spot reserved!", description: "You've joined this match." });
        queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Failed to join", description: error.message });
      },
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate({ id: postId, data: { content: message } }, {
      onSuccess: () => {
        setMessage("");
        queryClient.invalidateQueries({ queryKey: getGetPostMessagesQueryKey(postId) });
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Failed to send", description: error.message });
      },
    });
  };

  if (isLoadingPost) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!post) return <div className="h-screen flex items-center justify-center text-muted-foreground">Post not found</div>;

  const isOwner = user?.id === post.userId;
  const joinedUsers: any[] = (post as any).joinedUsers || [];
  const hasJoined = joinedUsers.some((u: any) => u.id === user?.id);
  const isFull = post.playersJoined >= post.playersNeeded;
  const spotsLeft = Math.max(0, post.playersNeeded - (post.playersJoined || 0));

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex-shrink-0 sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/community" className="text-muted-foreground hover:text-foreground -ml-1">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div className="flex-1 overflow-hidden">
          <h1 className="font-bold text-base truncate leading-tight">{post.title}</h1>
          <p className="text-xs text-muted-foreground">
            {post.playersJoined || 0} / {post.playersNeeded} players joined
            {spotsLeft > 0 && <span className="text-orange-500 font-bold"> · {spotsLeft} spots left</span>}
          </p>
        </div>
        {isFull && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-bold">FULL</Badge>}
      </header>

      {/* Tabs */}
      <div className="flex-shrink-0 flex bg-background border-b border-border">
        <button
          onClick={() => setTab("info")}
          className={cn("flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5",
            tab === "info" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
        >
          <Users className="h-3.5 w-3.5" /> Match Info
        </button>
        <button
          onClick={() => setTab("chat")}
          className={cn("flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5",
            tab === "chat" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Chat {(messages?.length ?? 0) > 0 && <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{messages?.length}</span>}
        </button>
      </div>

      {/* INFO TAB */}
      {tab === "info" && (
        <div className="flex-1 overflow-y-auto">
          {/* Organizer */}
          <div className="p-4 border-b border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Organizer</p>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={(post as any).userAvatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {post.userName?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-bold">{post.userName}</h3>
                <p className="text-xs text-muted-foreground">Match organizer</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-full gap-1.5 text-xs font-bold"
                onClick={() => setTab("chat")}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Message
              </Button>
            </div>
          </div>

          {/* Match Details */}
          <div className="p-4 border-b border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Match Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase mb-1.5">
                  <Calendar className="h-3 w-3 text-primary" /> Date
                </div>
                <p className="font-bold text-sm">{post.matchDate ? format(parseISO(post.matchDate), "MMM dd, yyyy") : "TBD"}</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase mb-1.5">
                  <Clock className="h-3 w-3 text-primary" /> Time
                </div>
                <p className="font-bold text-sm">{post.matchTime || "TBD"}</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3 col-span-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase mb-1.5">
                  <MapPin className="h-3 w-3 text-primary" /> Venue
                </div>
                <p className="font-bold text-sm">{post.turfName ? `${post.turfName}, ` : ""}{post.area}</p>
              </div>
            </div>
            {post.description && (
              <div className="mt-3 p-3 bg-muted/40 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{post.description}</p>
              </div>
            )}
          </div>

          {/* Players Joined */}
          <div className="p-4 border-b border-border/60">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Players Joined ({post.playersJoined || 0}/{post.playersNeeded})
              </p>
              <div className="h-1.5 bg-muted rounded-full w-24 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((post.playersJoined || 0) / post.playersNeeded) * 100)}%` }}
                />
              </div>
            </div>

            {joinedUsers.length > 0 ? (
              <div className="space-y-2">
                {joinedUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-xl">
                    <Avatar className="h-9 w-9 border border-border flex-shrink-0">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {u.name?.substring(0, 2).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{u.name}</p>
                      {u.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" /> {u.phone}
                        </p>
                      )}
                    </div>
                    {u.phone && (
                      <a
                        href={`tel:${u.phone}`}
                        className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 flex-shrink-0"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
                {/* Empty spots */}
                {spotsLeft > 0 && Array.from({ length: Math.min(spotsLeft, 3) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center gap-3 p-2.5 border border-dashed border-border/60 rounded-xl">
                    <div className="h-9 w-9 rounded-full border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
                      <UserPlus className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground/50 font-medium">Open spot</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground/60">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No players joined yet. Be the first!</p>
              </div>
            )}
          </div>

          {/* Reserve spot CTA */}
          {!isOwner && (
            <div className="p-4">
              {hasJoined ? (
                <Card className="p-4 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-green-700 dark:text-green-400">You've reserved a spot!</p>
                      <p className="text-xs text-green-600/80 dark:text-green-500">Chat with the organizer for more details.</p>
                    </div>
                    <Button size="sm" variant="outline" className="ml-auto h-8 text-xs font-bold border-green-300" onClick={() => setTab("chat")}>
                      Chat
                    </Button>
                  </div>
                </Card>
              ) : (
                <Button
                  className="w-full h-12 rounded-xl font-bold text-base gap-2"
                  onClick={handleJoin}
                  disabled={joinPostMutation.isPending || isFull}
                >
                  <UserPlus className="h-5 w-5" />
                  {joinPostMutation.isPending ? "Reserving..." : isFull ? "Match Full" : `Reserve a Spot (${spotsLeft} left)`}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* CHAT TAB */}
      {tab === "chat" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {isLoadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : messages?.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <MessageSquare className="h-12 w-12 mb-3 text-muted-foreground opacity-30" />
                <p className="font-bold text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Say hi to the organizer!</p>
              </div>
            ) : (
              messages?.map((msg, i) => {
                const isMe = msg.userId === user?.id;
                return (
                  <div key={msg.id || i} className={`flex gap-2 max-w-[85%] ${isMe ? "self-end flex-row-reverse" : "self-start"}`}>
                    {!isMe && (
                      <Avatar className="h-7 w-7 flex-shrink-0 mt-auto">
                        <AvatarImage src={(msg as any).userAvatar} />
                        <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                          {(msg as any).userName?.substring(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">{(msg as any).userName}</span>}
                      <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                        isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex-shrink-0 p-3 bg-background border-t border-border">
            {user ? (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message the group..."
                  className="flex-1 rounded-full h-11 bg-muted/50 border-transparent focus-visible:ring-primary/50"
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-11 w-11 rounded-full flex-shrink-0"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                >
                  <Send className="h-4 w-4 ml-[-2px] mt-[2px]" />
                </Button>
              </form>
            ) : (
              <div className="text-center p-2 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">
                  <Link href="/login" className="text-primary font-bold hover:underline">Log in</Link> to chat
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

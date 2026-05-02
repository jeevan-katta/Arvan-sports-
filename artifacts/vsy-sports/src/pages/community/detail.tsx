import { useState } from "react";
import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { 
  useGetPost, 
  useGetPostMessages,
  useSendPostMessage,
  useJoinPost,
  useGetMe
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, MapPin, Calendar, Clock, Send, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPostMessagesQueryKey, getGetPostQueryKey } from "@workspace/api-client-react";

export default function PostDetail() {
  const { id } = useParams();
  const postId = id || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [message, setMessage] = useState("");
  
  const { data: user } = useGetMe({ query: { retry: false }});
  const { data: post, isLoading: isLoadingPost } = useGetPost(postId, {
    query: { enabled: !!postId }
  });
  
  const { data: messages, isLoading: isLoadingMessages } = useGetPostMessages(postId, {
    query: { enabled: !!postId }
  });

  const joinPostMutation = useJoinPost();
  const sendMessageMutation = useSendPostMessage();

  const handleJoin = () => {
    if (!user) {
      toast({ title: "Login required", description: "Please login to join matches" });
      return;
    }
    
    joinPostMutation.mutate({ id: postId }, {
      onSuccess: () => {
        toast({ title: "Joined successfully!" });
        queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Failed to join", description: error.message });
      }
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      id: postId,
      data: { content: message }
    }, {
      onSuccess: () => {
        setMessage("");
        queryClient.invalidateQueries({ queryKey: getGetPostMessagesQueryKey(postId) });
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Failed to send", description: error.message });
      }
    });
  };

  if (isLoadingPost) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!post) return <div className="h-screen flex items-center justify-center">Post not found</div>;

  const isOwner = user?.id === post.userId;
  const hasJoined = post.joinedUsers?.some(u => u.id === user?.id);
  const isFull = post.playersJoined === post.playersNeeded;

  return (
    <div className="flex flex-col h-screen bg-background pb-safe">
      {/* Header */}
      <header className="flex-shrink-0 sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/community" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-6 w-6" />
        </Link>
        <div className="flex-1 overflow-hidden">
          <h1 className="font-bold text-lg truncate leading-tight">{post.title}</h1>
          <p className="text-xs text-muted-foreground truncate">
            {post.playersJoined || 0} / {post.playersNeeded} players joined
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-4 bg-muted/20 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12 border border-border">
              <AvatarImage src={post.userAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                {post.userName?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold">{post.userName}</h3>
              <p className="text-xs text-muted-foreground">Organizer</p>
            </div>
            {!isOwner && (
              <Button 
                variant={hasJoined ? "outline" : "default"} 
                size="sm" 
                className="rounded-full font-bold"
                onClick={handleJoin}
                disabled={joinPostMutation.isPending || (isFull && !hasJoined)}
              >
                {hasJoined ? "Joined" : isFull ? "Full" : "Join Match"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 bg-background rounded-xl p-3 shadow-sm border border-border/50">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">When</span>
              <div className="flex items-center text-sm font-medium">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-primary" />
                {post.matchDate ? format(parseISO(post.matchDate), "MMM dd") : 'TBD'}
              </div>
              <div className="flex items-center text-sm font-medium">
                <Clock className="h-3.5 w-3.5 mr-1.5 text-primary" />
                {post.matchTime || 'TBD'}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Where</span>
              <div className="flex items-start text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary mt-0.5" />
                <span className="line-clamp-2 leading-tight">
                  {post.turfName ? `${post.turfName}, ` : ''}{post.area}
                </span>
              </div>
            </div>
          </div>

          {post.description && (
            <div className="text-sm text-foreground/90 leading-relaxed bg-background p-3 rounded-xl border border-border/50 shadow-sm">
              {post.description}
            </div>
          )}
          
          {post.joinedUsers && post.joinedUsers.length > 0 && (
            <div className="mt-4">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-2">Players Joined</span>
              <div className="flex -space-x-2 overflow-hidden">
                {post.joinedUsers.map(u => (
                  <Avatar key={u.id} className="h-8 w-8 inline-block border-2 border-background ring-1 ring-border">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className="text-[10px]">{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 p-4 flex flex-col gap-4">
          <div className="text-center">
            <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal border-dashed">
              Match Discussion
            </Badge>
          </div>
          
          {isLoadingMessages ? (
            <div className="flex-1 flex items-center justify-center">Loading chat...</div>
          ) : messages?.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <MessageSquare className="h-10 w-10 mb-2" />
              <p className="text-sm">No messages yet. Say hi!</p>
            </div>
          ) : (
            <div className="flex-1 space-y-4 flex flex-col justify-end">
              {messages?.map((msg, i) => {
                const isMe = msg.userId === user?.id;
                return (
                  <div key={msg.id || i} className={`flex gap-2 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                    {!isMe && (
                      <Avatar className="h-8 w-8 flex-shrink-0 mt-auto">
                        <AvatarImage src={msg.userAvatar} />
                        <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                          {msg.userName?.substring(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && <span className="text-[10px] text-muted-foreground ml-1 mb-1">{msg.userName}</span>}
                      <div className={`px-4 py-2 rounded-2xl text-sm ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-br-sm' 
                          : 'bg-muted rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 p-3 bg-background border-t border-border">
        {user ? (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..." 
              className="flex-1 rounded-full h-11 bg-muted/50 border-transparent focus-visible:ring-primary/50"
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-11 w-11 rounded-full flex-shrink-0"
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              <Send className="h-5 w-5 ml-[-2px] mt-[2px]" />
            </Button>
          </form>
        ) : (
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="text-primary font-bold hover:underline">Log in</Link> to chat
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
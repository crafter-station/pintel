"use client";

import { MessageCircle, Send, User } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AVAILABLE_MODELS, shuffleModels } from "@/lib/models";

export default function HumanPlayPage() {
  // Select 4 random AI models on mount
  const selectedModels = useMemo(() => shuffleModels(AVAILABLE_MODELS, 4), []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
      {/* Left Column - Players */}
      <Card className="w-full lg:w-64 shrink-0">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Players
          </h3>

          {/* You - highlighted at top */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="size-3 rounded-full bg-primary ring-2 ring-primary/30" />
            <span className="text-sm font-medium text-primary">You</span>
            <User className="size-4 ml-auto text-primary" />
          </div>

          {/* AI Models */}
          <div className="space-y-2">
            {selectedModels.map((model) => (
              <div
                key={model.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: model.color }}
                />
                <span className="text-sm font-medium truncate">
                  {model.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Middle Column - Game Area */}
      <Card className="flex-1 min-w-0">
        <CardContent className="h-full flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <div className="size-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <User className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-light text-muted-foreground">
              Game Area
            </h2>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </div>
        </CardContent>
      </Card>

      {/* Right Column - Chat */}
      <Card className="w-full lg:w-80 shrink-0 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Chat
            </h3>
          </div>

          {/* Messages Container */}
          <div className="flex-1 min-h-[200px] rounded-lg bg-muted/30 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Messages will appear here
            </p>
          </div>

          {/* Input */}
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Type a message..."
              disabled
              className="flex-1"
            />
            <Button size="icon" disabled>
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

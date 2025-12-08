"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, History } from "lucide-react";

interface SignupPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DISMISS_KEY = "pintel_signup_dismissed";

export function SignupPrompt({ open, onOpenChange }: SignupPromptProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISS_KEY);
    if (wasDismissed) {
      setDismissed(true);
      onOpenChange(false);
    }
  }, [onOpenChange]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
    onOpenChange(false);
  };

  if (dismissed) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Unlock Your Full Experience</DialogTitle>
          </div>
          <DialogDescription>
            Sign up to save your progress and access exclusive features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-0.5">
              <History className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Save Your Sessions</h4>
              <p className="text-sm text-muted-foreground">
                Never lose your game history. Access all your drawings and guesses anytime.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-0.5">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Compete on Leaderboards</h4>
              <p className="text-sm text-muted-foreground">
                See how you rank against other players and track your progress.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-0.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Personal Gallery</h4>
              <p className="text-sm text-muted-foreground">
                Build your own collection of AI-generated artwork and share your favorites.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/sign-up">Sign Up Free</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

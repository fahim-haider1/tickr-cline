// src/components/kanban/HeaderBarClean.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { LogOut, Users } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

type Props = {
  currentWorkspaceName: string | undefined;
  isPersonal: boolean | undefined;
  openRight: () => void;
};

export default function HeaderBar({ currentWorkspaceName, isPersonal, openRight }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/60 backdrop-blur">
      <div className="flex items-center">
        <img src="/Group 5 (2).svg" alt="Tickr" className="h-6 w-auto" />
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" className="hidden sm:inline-flex">
          Dashboard
        </Button>
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-primary" />
          <span className="text-sm">{currentWorkspaceName ?? "—"}</span>
        </div>
        {!isPersonal && <Users className="w-5 h-5 opacity-70 cursor-pointer" onClick={openRight} />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="w-8 h-8 cursor-pointer">
              <AvatarFallback className="bg-muted text-foreground/80 text-xs">U</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <SignOutButton redirectUrl="/sign-in">
              <DropdownMenuItem className="cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


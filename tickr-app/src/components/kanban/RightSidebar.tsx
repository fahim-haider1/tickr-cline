// src/components/kanban/RightSidebar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronRight, PencilLine, Trash2, X } from "lucide-react";
import type { Member } from "@/types/kanban";
import { nameFromEmail } from "@/lib/kanban-utils";
import { useState } from "react";

type Props = {
  rightOpen: boolean;
  isPersonal?: boolean;
  closeRight: () => void;
  members: Member[];
  setMembers: (fn: (prev: Member[]) => Member[]) => void;
  remainingSlots: number;
};

export default function RightSidebar({
  rightOpen,
  isPersonal,
  closeRight,
  members,
  setMembers,
  remainingSlots,
}: Props) {
  const MAX_MEMBERS = 5;
  const atCapacity = remainingSlots === 0;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");

  const saveEdit = (id: string) => {
    setMembers((prev) => prev.map((pm) => (pm.id === id ? { ...pm, name: editName.trim() || pm.name } : pm)));
    setEditingId(null);
    setEditName("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  return (
    <aside
      className={[
        "fixed inset-y-0 right-0 bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out overflow-hidden",
        rightOpen ? "w-80 border-l border-sidebar-border" : "w-0 border-l-0",
        isPersonal ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
    >
      <div className="h-full flex flex-col p-4 gap-4">
        {rightOpen && (
          <div className="flex items-center justify-between">
            <button onClick={closeRight} className="p-1 rounded hover:bg-sidebar/50 transition" aria-label="Collapse">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <span className="text-base font-semibold mx-auto">Team Members</span>
            <div className="w-6" />
          </div>
        )}

        {rightOpen ? (
          <div className="flex-1 overflow-y-auto space-y-4">
            {members.length > 0 && (
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground/70 text-xs">
                      {m.name ? m.name[0]?.toUpperCase() : m.email[0]?.toUpperCase()}
                    </div>

                    <div className="flex-1">
                      {editingId === m.id ? (
                        <div className="flex items-center gap-2">
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                          <Button size="icon" className="h-8 w-8" onClick={() => saveEdit(m.id)} aria-label="Save">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={cancelEdit} aria-label="Cancel">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">{m.name}</div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingId(m.id)}
                            aria-label="Edit name"
                          >
                            <PencilLine className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">{m.email}</div>

                      <div className="mt-2 max-w-[180px]">
                        <Select
                          value={m.role}
                          onValueChange={(v: "admin" | "member" | "viewer") =>
                            setMembers((prev) => prev.map((pm) => (pm.id === m.id ? { ...pm, role: v } : pm)))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setMembers((prev) => prev.filter((pm) => pm.id !== m.id))}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Card className="bg-card border-border max-w-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">Add New Member</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  {atCapacity
                    ? "Member slots are full."
                    : `You can add ${remainingSlots} more ${remainingSlots === 1 ? "member" : "members"} in this team.`}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email" className="text-xs">
                    Enter email address
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="name@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={atCapacity}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Select Role</Label>
                  <Select value={inviteRole} onValueChange={(v: "admin" | "member" | "viewer") => setInviteRole(v)} disabled={atCapacity}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full bg-primary text-primary-foreground h-9"
                  onClick={() => {
                    const email = inviteEmail.trim().toLowerCase();
                    if (!email || atCapacity) return;
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
                    if (members.some((m) => m.email === email)) return;
                    setMembers((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        email,
                        name: nameFromEmail(email),
                        role: inviteRole,
                      },
                    ]);
                    setInviteEmail("");
                    setInviteRole("member");
                  }}
                  disabled={atCapacity}
                >
                  Send Invite
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </aside>
  );
}

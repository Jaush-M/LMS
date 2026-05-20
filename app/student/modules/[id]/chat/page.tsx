import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ChatForm } from "./chat-form";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty";

const AVATAR_TONES = ["lav", "peach", "sky", "rose", "lemon", "sand", "mint", ""] as const;
type AvatarTone = (typeof AVATAR_TONES)[number];

function toneForName(name: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default async function StudentChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account } = await requireAuthPage({ roles: ["STUDENT"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id },
    include: {
      templateModule: { include: { module: true } },
      moduleGroupChat: true,
    },
  });
  if (!mo || !mo.moduleGroupChat) notFound();

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: account.id, courseOfferingId: mo.courseOfferingId, status: "ACTIVE" },
  });
  if (!enrollment) notFound();

  const messages = await prisma.chatMessage.findMany({
    where: { chatId: mo.moduleGroupChat.id, status: { not: "REMOVED" } },
    include: { sender: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  await prisma.chatParticipantActivity.upsert({
    where: { chatId_userId: { chatId: mo.moduleGroupChat.id, userId: account.id } },
    update: { lastSeenAt: new Date() },
    create: { chatId: mo.moduleGroupChat.id, userId: account.id, lastSeenAt: new Date() },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href={`/student/modules/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {mo.templateModule.module.name}
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Group Chat
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{mo.templateModule.module.name}</p>
      </div>

      {/* Messages */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          minHeight: 280,
          overflow: "hidden",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState title="No messages yet" body="Start the conversation below." />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {messages.map((msg) => {
              const isMe = msg.senderId === account.id;
              const senderName = msg.sender.user.name;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--line-2)",
                    background: isMe ? "var(--primary-softer)" : "transparent",
                  }}
                >
                  <Avatar initials={initials(senderName)} tone={toneForName(senderName)} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{senderName}</span>
                      <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
                        {msg.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {msg.status === "EDITED" && (
                        <span style={{ fontSize: 11, color: "var(--ink-4)" }}>(edited)</span>
                      )}
                    </div>
                    <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.5 }}>{msg.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!mo.moduleGroupChat.isReadOnly && (
        <ChatForm chatId={mo.moduleGroupChat.id} moduleOfferingId={id} senderId={account.id} />
      )}
    </div>
  );
}

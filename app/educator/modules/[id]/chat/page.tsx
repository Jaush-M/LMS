import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChatForm } from "./chat-form";

export default async function EducatorChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "EDUCATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: actor.id },
    include: {
      templateModule: { include: { module: true } },
      moduleGroupChat: true,
    },
  });
  if (!mo || !mo.moduleGroupChat) notFound();

  const messages = await prisma.chatMessage.findMany({
    where: { chatId: mo.moduleGroupChat.id, status: { not: "REMOVED" } },
    include: { sender: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Mark last seen
  await prisma.chatParticipantActivity.upsert({
    where: { chatId_userId: { chatId: mo.moduleGroupChat.id, userId: actor.id } },
    update: { lastSeenAt: new Date() },
    create: { chatId: mo.moduleGroupChat.id, userId: actor.id, lastSeenAt: new Date() },
  });

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Chat — {mo.templateModule.module.name}</h1>
        <Link href={`/educator/modules/${id}`} className="text-sm text-blue-600 underline">Back to module</Link>
      </div>

      <div className="rounded border border-gray-200 bg-white min-h-64 mb-4">
        {messages.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">No messages yet. Start the conversation!</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {messages.map((msg) => {
              const isMe = msg.senderId === actor.id;
              return (
                <li key={msg.id} className={`px-5 py-3 ${isMe ? "bg-blue-50" : ""}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-800">{msg.sender.user.name}</span>
                    <span className="text-xs text-gray-400">{msg.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    {msg.status === "EDITED" && <span className="text-xs text-gray-400">(edited)</span>}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">{msg.body}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!mo.moduleGroupChat.isReadOnly && (
        <ChatForm chatId={mo.moduleGroupChat.id} moduleOfferingId={id} senderId={actor.id} />
      )}
      {mo.moduleGroupChat.isReadOnly && (
        <p className="text-sm text-gray-400 italic">Chat is read-only.</p>
      )}
    </main>
  );
}

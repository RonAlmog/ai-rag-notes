"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuthToken } from "@convex-dev/auth/react";
import { Bot, Expand, Minimize, Send, Trash, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import Markdown from "@/components/markdown";

const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
  /.cloud$/,
  ".site"
);
console.log({ convexSiteUrl });

export function AIChatButton() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setChatOpen(true)} variant="outline">
        <Bot />
        <span>Ask AI</span>
      </Button>
      <AIChatBox open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}

interface AIChatBoxProps {
  open: boolean;
  onClose: () => void;
}

const initialMessages: UIMessage[] = [
  {
    id: "123456",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Hello, I'm your AI assistant. How can I assist you today?",
      },
    ],
  },
];

function AIChatBox({ open, onClose }: AIChatBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const token = useAuthToken();
  const { sendMessage, messages, setMessages, status } = useChat({
    // migreation from 4 to 5
    // Automatically submit when all tool results are available
    // sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new DefaultChatTransport({
      api: `${convexSiteUrl}/api/chat`,
      // because we are calling external api, we have to add the token for auth.
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    messages: initialMessages,
    //maxStep: 3,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isProcessing = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputValue.trim() && !isProcessing) {
      sendMessage({ text: inputValue });
      setInputValue("");
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  if (!open) return null;

  const lastMessageIsUser = messages[messages.length - 1]?.role === "user";

  return (
    <div
      className={cn(
        "animate-in slide-in-from-bottom-10 bg-card fixed right-4 bottom-4 z-50 flex flex-col rounded-lg border shadow-lg duration-300 2xl:right-16",
        isExpanded
          ? "h-[650px] max-h-[90vh] w-[550px]"
          : "h-[500px] max-h-[80vh] w-80 sm:w-96"
      )}
    >
      <div className="bg-primary text-primary-foreground flex items-center justify-between rounded-t-lg border-b p-3">
        <div className="flex items-center gap-2">
          <Bot size={18} />
          <h3 className="font-medium">Notes Assistant</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary-foreground hover:bg-primary/90 h-8 w-8"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? <Minimize /> : <Expand />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMessages(initialMessages)}
            className="text-primary-foreground hover:bg-primary/90 h-8 w-8"
            title="Clear chat"
            disabled={isProcessing}
          >
            <Trash />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary/90 h-8 w-8"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {status === "submitted" && lastMessageIsUser && <Loader />}
        {status === "error" && <ErrorMessage />}
        <div ref={messagesEndRef} />
      </div>

      <form className="flex gap-2 border-t p-3" onSubmit={onSubmit}>
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          className="max-h-[120px] min-h-[40px] resize-none overflow-y-auto"
          maxLength={1000}
          autoFocus
          onKeyDown={handleKeyDown}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isProcessing || !inputValue.trim()}
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

interface ChatMessageProps {
  message: UIMessage;
}
function ChatMessage({ message }: ChatMessageProps) {
  const currentStep = message.parts[message.parts.length - 1]; // take the last

  // "message" has parts
  // every part has type and text
  // message also has "role" that can be user, assistant (tht's the ai), tool, and more
  return (
    <div
      className={cn(
        "mb-2 flex max-w-[80%] flex-col prose dark:prose-invert",
        message.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div
        className={cn(
          "prose dark:prose-invert rounded-lg px-3 py-2 text-sm",
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted first:prose-p:mt-0"
        )}
      >
        {message.role === "assistant" && (
          <div className="text-muted-foreground mb-1 flex items-center gap-1 text-xs font-medium">
            <Bot className="text-primary size-3" />
            AI Assistant
          </div>
        )}
        {currentStep?.type === "text" && (
          <Markdown>{currentStep.text}</Markdown>
        )}
        {currentStep.type === "tool-invocation" && (
          <div className="italic animate-pulse">Searching notes...</div>
        )}
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="ml-2 flex items-center gap-1 py-2">
      <div className="bg-primary size-1.5 animate-pulse rounded-full" />
      <div className="bg-primary size-1.5 animate-pulse rounded-full delay-150" />
      <div className="bg-primary size-1.5 animate-pulse rounded-full delay-300" />
    </div>
  );
}

function ErrorMessage() {
  return (
    <div className="text-sm text-red-500">
      An error occurred while processing your request.
    </div>
  );
}

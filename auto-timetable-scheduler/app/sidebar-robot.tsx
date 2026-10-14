"use client";

import dynamic from "next/dynamic";
import type { DotLottie } from "@lottiefiles/dotlottie-react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { AssistantContext } from "./scheduling/types";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

const DotLottieReact = dynamic(
  () =>
    import("@lottiefiles/dotlottie-react").then(
      (module) => module.DotLottieReact
    ),
  { ssr: false }
);

const CHAT_STORAGE_KEY = "chronos-sidebar-assistant";
const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 3000;
const MAX_REQUEST_HISTORY_LENGTH = 12000;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AssistantState =
  | "idle"
  | "thinking"
  | "responding"
  | "confused"
  | "error";
type Reaction =
  | "curious"
  | "cheerful"
  | "sleepy"
  | "surprised"
  | "thoughtful"
  | "grumpy"
  | null;

function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createMessage(
  role: ChatMessage["role"],
  content: string
): ChatMessage {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

export default function SidebarRobot({
  context,
  onOpenCalendar,
}: {
  context: AssistantContext;
  onOpenCalendar: () => void;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const lookRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reactionTimerRef = useRef<number | null>(null);
  const responseTimerRef = useRef<number | null>(null);
  const wasChatOpenRef = useRef(false);
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const [reaction, setReaction] = useState<Reaction>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [assistantState, setAssistantState] =
    useState<AssistantState>("idle");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [historyReady, setHistoryReady] = useState(false);

  const handleLottieRef = useCallback((instance: DotLottie | null) => {
    setDotLottie(instance);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    const desktopLayout = window.matchMedia("(min-width: 1024px)");
    const updateSidebarVisibility = () =>
      setSidebarVisible(desktopLayout.matches);

    updatePreference();
    updateSidebarVisibility();
    preference.addEventListener("change", updatePreference);
    desktopLayout.addEventListener("change", updateSidebarVisibility);

    return () => {
      preference.removeEventListener("change", updatePreference);
      desktopLayout.removeEventListener("change", updateSidebarVisibility);
    };
  }, []);

  useEffect(() => {
    if (!dotLottie) return;

    if (reducedMotion || !sidebarVisible) {
      dotLottie.pause();
      dotLottie.setFrame(0);
    } else {
      dotLottie.play();
    }
  }, [dotLottie, reducedMotion, sidebarVisible]);

  useEffect(() => {
    if (reducedMotion || !sidebarVisible) return;

    const pointerCapability = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );
    const slot = slotRef.current;
    const lookElement = lookRef.current;
    const sidebar = slot?.closest(".desktop-sidebar");
    if (!slot || !lookElement || !sidebar) return;

    const resetLook = () => {
      lookElement.style.setProperty("--robot-rotate-x", "0deg");
      lookElement.style.setProperty("--robot-rotate-y", "0deg");
      lookElement.style.setProperty("--robot-shift-x", "0px");
      lookElement.style.setProperty("--robot-shift-y", "0px");
    };

    const trackPointer = (event: PointerEvent) => {
      if (!pointerCapability.matches || event.pointerType === "touch") return;

      const sidebarBounds = sidebar.getBoundingClientRect();
      if (
        event.clientX < sidebarBounds.left ||
        event.clientX > sidebarBounds.right ||
        event.clientY < sidebarBounds.top ||
        event.clientY > sidebarBounds.bottom
      ) {
        resetLook();
        return;
      }

      const robotBounds = slot.getBoundingClientRect();
      const horizontal = Math.max(
        -1,
        Math.min(
          1,
          (event.clientX - (robotBounds.left + robotBounds.width / 2)) /
            (sidebarBounds.width / 2)
        )
      );
      const vertical = Math.max(
        -1,
        Math.min(
          1,
          (event.clientY - (robotBounds.top + robotBounds.height / 2)) /
            (sidebarBounds.height / 2)
        )
      );

      lookElement.style.setProperty(
        "--robot-rotate-y",
        `${horizontal * 6}deg`
      );
      lookElement.style.setProperty(
        "--robot-rotate-x",
        `${vertical * -4}deg`
      );
      lookElement.style.setProperty(
        "--robot-shift-x",
        `${horizontal * 3}px`
      );
      lookElement.style.setProperty(
        "--robot-shift-y",
        `${vertical * 2}px`
      );
    };

    const syncPointerTracking = () => {
      if (pointerCapability.matches) {
        window.addEventListener("pointermove", trackPointer, {
          passive: true,
        });
      } else {
        window.removeEventListener("pointermove", trackPointer);
      }
      resetLook();
    };

    if (pointerCapability.matches) {
      window.addEventListener("pointermove", trackPointer, { passive: true });
    }
    sidebar.addEventListener("pointerleave", resetLook);
    window.addEventListener("blur", resetLook);
    pointerCapability.addEventListener("change", syncPointerTracking);

    return () => {
      window.removeEventListener("pointermove", trackPointer);
      sidebar.removeEventListener("pointerleave", resetLook);
      window.removeEventListener("blur", resetLook);
      pointerCapability.removeEventListener("change", syncPointerTracking);
      resetLook();
    };
  }, [reducedMotion, sidebarVisible]);

  useEffect(() => {
    let restoredMessages: ChatMessage[] = [];
    let restoreError = "";

    try {
      const savedHistory = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (savedHistory) {
        const parsed: unknown = JSON.parse(savedHistory);
        if (
          !Array.isArray(parsed) ||
          !parsed.every(isChatMessage)
        ) {
          throw new Error("Saved assistant history is invalid.");
        }
        restoredMessages = parsed.slice(-MAX_HISTORY);
      }
    } catch {
      restoreError =
        "Chat history could not be restored from this browser session.";
    }

    const timer = window.setTimeout(() => {
      if (restoreError) setStorageError(restoreError);
      setMessages(restoredMessages);
      setHistoryReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!historyReady) return;

    try {
      sessionStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_HISTORY))
      );
    } catch {
      window.setTimeout(
        () =>
          setStorageError(
            "Chat history could not be saved in this browser session."
          ),
        0
      );
    }
  }, [historyReady, messages]);

  useEffect(() => {
    if (chatOpen) {
      inputRef.current?.focus();
      wasChatOpenRef.current = true;
    } else if (wasChatOpenRef.current) {
      triggerRef.current?.focus();
      wasChatOpenRef.current = false;
    }
  }, [chatOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [assistantState, messages, reducedMotion]);

  useEffect(
    () => () => {
      if (reactionTimerRef.current !== null) {
        window.clearTimeout(reactionTimerRef.current);
      }
      if (responseTimerRef.current !== null) {
        window.clearTimeout(responseTimerRef.current);
      }
    },
    []
  );

  const playGreeting = () => {
    if (reactionTimerRef.current !== null) {
      window.clearTimeout(reactionTimerRef.current);
    }

    setReaction("curious");
    reactionTimerRef.current = window.setTimeout(() => {
      setReaction("cheerful");
      reactionTimerRef.current = window.setTimeout(
        () => setReaction(null),
        850
      );
    }, 350);
  };

  const toggleChat = () => {
    playGreeting();
    setChatOpen((open) => !open);
  };

  const closeChat = () => {
    setChatOpen(false);
    if (reactionTimerRef.current !== null) {
      window.clearTimeout(reactionTimerRef.current);
      reactionTimerRef.current = null;
    }
    setReaction(null);
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || assistantState === "thinking") return;

    const conversation = [
      ...messages,
      createMessage("user", content),
    ].slice(-MAX_HISTORY);
    setMessages(conversation);
    setDraft("");
    setError("");
    setAssistantState("thinking");

    try {
      const requestMessages: ChatMessage[] = [];
      let requestLength = 0;
      for (let index = conversation.length - 1; index >= 0; index -= 1) {
        const message = conversation[index];
        if (
          requestLength + message.content.length >
          MAX_REQUEST_HISTORY_LENGTH
        ) {
          break;
        }
        requestMessages.unshift(message);
        requestLength += message.content.length;
      }

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages.map(({ role, content: message }) => ({
            role,
            content: message,
          })),
          context,
        }),
      });

      const data: unknown = await response.json();
      if (!isRecord(data)) {
        throw new Error("The assistant returned an invalid response.");
      }
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "The assistant could not reply. Please try again."
        );
      }
      if (typeof data.reply !== "string") {
        throw new Error("The assistant returned an invalid response.");
      }
      const reply = data.reply;

      setMessages((current) =>
        [
          ...current,
          createMessage("assistant", reply),
        ].slice(-MAX_HISTORY)
      );
      setAssistantState("responding");
      if (responseTimerRef.current !== null) {
        window.clearTimeout(responseTimerRef.current);
      }
      responseTimerRef.current = window.setTimeout(
        () => setAssistantState("idle"),
        1100
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "The assistant could not reply. Check your connection and try again.";
      setAssistantState(
        message.includes("invalid response") ? "confused" : "error"
      );
      setError(message);
    }
  };

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const showChangePreviewButton =
    latestUserMessage !== undefined &&
    /\b(move|change|adjust|reschedul|find a time|avoid my|switch)\b/i.test(
      latestUserMessage.content
    );

  return (
    <div ref={slotRef} className="sidebar-robot-slot">
      <button
        ref={triggerRef}
        type="button"
        className="sidebar-robot-trigger"
        aria-label={chatOpen ? "Close Chronos assistant" : "Open Chronos assistant"}
        aria-haspopup="dialog"
        aria-expanded={chatOpen}
        aria-controls={chatOpen ? "chronos-assistant-panel" : undefined}
        onClick={toggleChat}
      >
        <span className="sidebar-robot-hint">
          <MessageCircle size={13} />
          <span>Talk to your assistant</span>
        </span>
        <span
          ref={lookRef}
          className="sidebar-robot-look"
          data-reaction={reaction ?? undefined}
          data-assistant-state={assistantState}
          aria-hidden="true"
        >
          <span className="sidebar-robot-motion">
            <DotLottieReact
              src="/ai-robot-vector-art.lottie"
              autoplay={!reducedMotion && sidebarVisible}
              loop={!reducedMotion && sidebarVisible}
              speed={0.9}
              backgroundColor="transparent"
              layout={{ fit: "contain", align: [0.5, 0.5] }}
              dotLottieRefCallback={handleLottieRef}
              className="sidebar-robot-animation"
            />
          </span>
        </span>
      </button>

      {chatOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <section
            id="chronos-assistant-panel"
            className="robot-chat-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby="robot-chat-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeChat();
            }}
          >
          <header className="robot-chat-header">
            <span className="robot-chat-avatar" aria-hidden="true">
              <Sparkles size={16} />
            </span>
            <span className="robot-chat-heading">
              <span id="robot-chat-title">Chronos assistant</span>
              <span className="robot-chat-subtitle">
                {assistantState === "thinking"
                  ? "Thinking…"
                  : "Here to help you plan"}
              </span>
            </span>
            <button
              type="button"
              className="robot-chat-close"
              onClick={closeChat}
              aria-label="Close assistant chat"
            >
              <X size={17} />
            </button>
          </header>

          <div
            className="robot-chat-messages"
            role="log"
            aria-live="polite"
            aria-busy={assistantState === "thinking"}
          >
            {messages.length === 0 && (
              <p className="robot-chat-empty">
                Ask about planning courses, balancing your week, or using
                Chronos.
              </p>
            )}
            {messages.map((message) => (
              <p
                key={message.id}
                className={`robot-chat-message robot-chat-message--${message.role}`}
              >
                {message.content}
              </p>
            ))}
            {assistantState === "thinking" && (
              <p
                className="robot-chat-thinking"
                role="status"
                aria-label="Assistant is thinking"
              >
                <span />
                <span />
                <span />
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <p className="robot-chat-error" role="alert">
              {error}
            </p>
          )}
          {storageError && (
            <p className="robot-chat-storage-note" role="status">
              {storageError}
            </p>
          )}

          {showChangePreviewButton && (
              <button
                type="button"
                onClick={onOpenCalendar}
                className="mx-3 mb-2 flex min-h-9 items-center justify-center rounded-lg border border-[#e8e1d6] px-3 text-xs font-semibold text-[#514c43] hover:bg-[#f8f5ef]"
              >
                Open Calendar change preview
              </button>
            )}

          <form className="robot-chat-form" onSubmit={sendMessage}>
            <label className="sr-only" htmlFor="robot-chat-input">
              Message Chronos assistant
            </label>
            <input
              ref={inputRef}
              id="robot-chat-input"
              type="text"
              maxLength={MAX_MESSAGE_LENGTH}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask Chronos…"
              autoComplete="off"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim() || assistantState === "thinking"}
            >
              <Send size={16} />
            </button>
          </form>
          </section>,
          document.body
        )}
    </div>
  );
}

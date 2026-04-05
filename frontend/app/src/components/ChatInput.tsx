import { useState, useRef, useEffect, useCallback } from "react";
import { SendHorizonal, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const { t, lang } = useTranslation();
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  const toggleVoice = useCallback(() => {
    if (!SpeechRecognition) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === "kz" ? "kk-KZ" : lang === "en" ? "en-US" : "ru-RU";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setText(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, lang]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    onSend(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-3 border-t border-border/50 bg-background/80 backdrop-blur-sm px-4 py-4"
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("chat.inputPlaceholder")}
        disabled={disabled}
        rows={1}
        className={cn(
          "flex-1 resize-none rounded-2xl border border-border/50 bg-card px-5 py-3.5 text-sm",
          "placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30",
          "disabled:opacity-50 disabled:cursor-not-allowed transition-all",
        )}
      />
      {SpeechRecognition && (
        <button
          type="button"
          onClick={toggleVoice}
          disabled={disabled}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all",
            isListening
              ? "border-red-400 bg-red-500/10 text-red-500 animate-pulse shadow-lg shadow-red-500/20"
              : "border-border/50 bg-card text-muted-foreground hover:text-primary hover:border-primary/30",
            "disabled:opacity-30 disabled:cursor-not-allowed",
          )}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
      )}
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-bg text-white shadow-lg shadow-emerald-500/15 transition-all",
          "hover:shadow-emerald-500/30 hover:scale-[1.05] active:scale-[0.95]",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none",
        )}
      >
        <SendHorizonal size={18} />
      </button>
    </form>
  );
}

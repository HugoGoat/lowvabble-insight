import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn(
      "flex gap-4 animate-slide-up",
      isUser && "flex-row-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
        isUser ? "bg-secondary" : "gradient-hero"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-secondary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-primary-foreground" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-3",
        isUser 
          ? "bg-primary text-primary-foreground rounded-tr-sm" 
          : "bg-card border border-border rounded-tl-sm"
      )}>
        <div className={cn(
          "prose-chat text-sm leading-relaxed",
          isUser && "text-primary-foreground"
        )}>
          {content.split('\n').map((line, i) => (
            <p key={i} className={line === '' ? 'h-3' : ''}>
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

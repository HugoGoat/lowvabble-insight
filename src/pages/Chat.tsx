import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import ChatMessage from '@/components/chat/ChatMessage';
import InputBar from '@/components/chat/InputBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Trash2, Bot, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('https://n8n.srv755107.hstgr.cloud/webhook/baa3f90a-7116-440a-9d5f-06e44505094e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur de communication avec le chatbot');
      }

      const data = await response.json();
      console.log('n8n response:', JSON.stringify(data, null, 2));
      
      // Handle various possible response structures from n8n
      let responseContent = '';
      if (typeof data === 'string') {
        responseContent = data;
      } else if (data.output) {
        responseContent = data.output;
      } else if (data.text) {
        responseContent = data.text;
      } else if (data.message) {
        responseContent = data.message;
      } else if (data.response) {
        responseContent = data.response;
      } else if (Array.isArray(data) && data.length > 0) {
        responseContent = data[0].output || data[0].text || data[0].message || JSON.stringify(data[0]);
      } else {
        responseContent = JSON.stringify(data);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent || 'Je n\'ai pas pu générer de réponse.',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de contacter le chatbot',
        variant: 'destructive',
      });
      // Remove the user message if there's an error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    }

    setIsLoading(false);
  };

  const clearChat = () => {
    setMessages([]);
    toast({
      title: 'Conversation effacée',
      description: 'L\'historique a été supprimé.',
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold">Chatbot RAG</h1>
                <p className="text-sm text-muted-foreground">Interrogez vos documents</p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearChat}>
                <Trash2 className="w-4 h-4 mr-2" />
                Effacer
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-8 py-6">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center py-20">
                <Card className="border-border/50 bg-muted/30 max-w-md w-full">
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Assistant RAG</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Posez vos questions sur vos documents uploadés. Je recherche et synthétise les informations pour vous.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['Résume ce document', 'Quelles sont les dates clés ?', 'Compare les sections'].map(q => (
                        <button
                          key={q}
                          onClick={() => handleSend(q)}
                          className="text-xs px-3 py-1.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map(message => (
                  <ChatMessage key={message.id} role={message.role} content={message.content} />
                ))}
                {isLoading && (
                  <div className="flex gap-4 animate-slide-up">
                    <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Recherche en cours...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-8 py-4">
            <InputBar onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

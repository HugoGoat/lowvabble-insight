import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import AppLayout from '@/components/layout/AppLayout';
import ChatMessage from '@/components/chat/ChatMessage';
import InputBar from '@/components/chat/InputBar';
import ConversationSidebar from '@/components/chat/ConversationSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Bot, Loader2, Menu, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function Chat() {
  const { user } = useAuth();
  const { canExportConversations } = usePermissions();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load conversations
  useEffect(() => {
    if (!user) return;
    
    const loadConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (!error && data) {
        setConversations(data);
      }
    };
    
    loadConversations();
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversationId || !user) {
      setMessages([]);
      return;
    }
    
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setMessages(data.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })));
      }
    };
    
    loadMessages();
  }, [activeConversationId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createConversation = async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;
    
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title })
      .select()
      .single();
    
    if (error || !data) {
      toast({ title: 'Erreur', description: 'Impossible de créer la conversation', variant: 'destructive' });
      return null;
    }
    
    setConversations(prev => [data, ...prev]);
    setActiveConversationId(data.id);
    return data.id;
  };

  const saveMessage = async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    if (!user) return;
    
    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role,
      content,
    });
  };

  const handleSend = async (content: string) => {
    if (!user) return;

    let convId = activeConversationId;
    
    // Create new conversation if needed
    if (!convId) {
      convId = await createConversation(content);
      if (!convId) return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Save user message
    await saveMessage(convId, 'user', content);

    try {
      // Build conversation history for n8n context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('https://n8n.srv755107.hstgr.cloud/webhook/baa3f90a-7116-440a-9d5f-06e44505094e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          user_id: user.id,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur de communication avec le chatbot');
      }

      const data = await response.json();
      
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
      
      // Save assistant message
      await saveMessage(convId, 'assistant', assistantMessage.content);
      
      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);
        
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de contacter le chatbot',
        variant: 'destructive',
      });
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    }

    setIsLoading(false);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (id: string) => {
    const { error } = await supabase.from('conversations').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
      return;
    }
    
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
    
    toast({ title: 'Conversation supprimée' });
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setSidebarOpen(false);
  };

  const handleExportConversation = (format: 'json' | 'txt' | 'md') => {
    if (!activeConversationId || messages.length === 0) return;

    const conversation = conversations.find(c => c.id === activeConversationId);
    const title = conversation?.title || 'conversation';
    const timestamp = new Date().toISOString().split('T')[0];

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'json') {
      content = JSON.stringify({
        title: conversation?.title,
        exported_at: new Date().toISOString(),
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }, null, 2);
      filename = `${title}-${timestamp}.json`;
      mimeType = 'application/json';
    } else if (format === 'txt') {
      content = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');
      filename = `${title}-${timestamp}.txt`;
      mimeType = 'text/plain';
    } else {
      content = `# ${conversation?.title || 'Conversation'}\n\n` +
        messages.map(m => `**${m.role === 'user' ? 'Vous' : 'Assistant'}:**\n\n${m.content}`).join('\n\n---\n\n');
      filename = `${title}-${timestamp}.md`;
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Conversation exportée' });
  };

  const sidebarContent = (
    <ConversationSidebar
      conversations={conversations}
      activeId={activeConversationId}
      onSelect={handleSelectConversation}
      onNew={handleNewConversation}
      onDelete={handleDeleteConversation}
    />
  );

  return (
    <AppLayout>
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          {sidebarContent}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
              {/* Mobile menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  {sidebarContent}
                </SheetContent>
              </Sheet>

              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="font-semibold">Chatbot RAG</h1>
                <p className="text-sm text-muted-foreground">Interrogez vos documents</p>
              </div>

              {/* Export button */}
              {canExportConversations && activeConversationId && messages.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Exporter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportConversation('json')}>
                      Format JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportConversation('txt')}>
                      Format Texte
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportConversation('md')}>
                      Format Markdown
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
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
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-4">
              <InputBar onSend={handleSend} disabled={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

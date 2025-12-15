import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/firebase';
import { ref, push, set, onValue, get } from 'firebase/database';
import { Send, Check, CheckCheck, FileText, Image, Volume2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  senderName?: string;
  status: 'sent' | 'delivered' | 'seen';
  createdAt: string;
  isDocument?: boolean;
  documentUrl?: string;
  documentName?: string;
  fileUrl?: string;
  fileType?: 'image' | 'audio' | 'document';
  readByUser?: boolean;
}

const Support: React.FC = () => {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [adminTyping, setAdminTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // Check for existing session or create new one
    const sessionsRef = ref(database, `supportSessions/${user.uid}`);
    get(sessionsRef).then((snapshot) => {
      if (snapshot.exists()) {
        const sessions = snapshot.val();
        const activeSession = Object.entries(sessions).find(
          ([, value]: [string, any]) => value.status === 'active'
        );
        
        if (activeSession) {
          setSessionId(activeSession[0]);
        } else {
          createNewSession();
        }
      } else {
        createNewSession();
      }
    });
  }, [user]);

  const createNewSession = async () => {
    if (!user) return;

    const sessionRef = push(ref(database, `supportSessions/${user.uid}`));
    await set(sessionRef, {
      userId: user.uid,
      userName: userData?.name || 'Usuário',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
    });
    setSessionId(sessionRef.key);
  };

  useEffect(() => {
    if (!user || !sessionId) return;

    // Listen to messages
    const messagesRef = ref(database, `supportMessages/${user.uid}/${sessionId}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const messagesArray = Object.entries(data)
          .map(([id, value]: [string, any]) => ({ id, ...value }))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(messagesArray);

        // Mark admin messages as read
        messagesArray.forEach((msg) => {
          if (msg.sender === 'admin' && !msg.readByUser) {
            set(ref(database, `supportMessages/${user.uid}/${sessionId}/${msg.id}/readByUser`), true);
          }
        });
      }
    });

    // Listen to admin typing
    const typingRef = ref(database, `supportSessions/${user.uid}/${sessionId}/adminTyping`);
    onValue(typingRef, (snapshot) => {
      setAdminTyping(snapshot.val() || false);
    });

    return () => unsubscribe();
  }, [user, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !sessionId) return;

    const messageRef = push(ref(database, `supportMessages/${user.uid}/${sessionId}`));
    await set(messageRef, {
      text: newMessage.trim(),
      sender: 'user',
      status: 'sent',
      createdAt: new Date().toISOString(),
    });

    // Update session last message
    await set(ref(database, `supportSessions/${user.uid}/${sessionId}/lastMessageAt`), new Date().toISOString());
    await set(ref(database, `supportSessions/${user.uid}/${sessionId}/lastMessage`), newMessage.trim());

    setNewMessage('');

    // Check if admin hasn't responded in 1 minute - only send once per session
    setTimeout(async () => {
      const messagesSnap = await get(ref(database, `supportMessages/${user.uid}/${sessionId}`));
      if (messagesSnap.exists()) {
        const msgs = Object.values(messagesSnap.val()) as Message[];
        
        // Check if auto-reply was already sent in this session
        const hasAutoReply = msgs.some((msg: any) => msg.isAutoReply);
        if (hasAutoReply) return;
        
        const lastMsg = msgs.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

        if (lastMsg.sender === 'user') {
          // Send auto-reply only once
          const autoReplyRef = push(ref(database, `supportMessages/${user.uid}/${sessionId}`));
          await set(autoReplyRef, {
            text: `Olá ${userData?.name || 'cliente'}, obrigado por entrar em contato. Estamos respondendo várias mensagens, por favor aguarde que responderemos já.`,
            sender: 'admin',
            senderName: 'Roleta.winner',
            status: 'delivered',
            createdAt: new Date().toISOString(),
            isAutoReply: true,
          });
        }
      }
    }, 60000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'seen':
        return <CheckCheck className="w-3 h-3 text-primary" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      default:
        return <Check className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const renderMessageContent = (message: Message) => {
    // Check for file content
    if (message.fileUrl) {
      if (message.fileType === 'image') {
        return (
          <div className="space-y-2">
            <img 
              src={message.fileUrl} 
              alt="Imagem" 
              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.fileUrl, '_blank')}
            />
            {message.text && message.text !== message.documentName && (
              <p className="text-sm">{message.text}</p>
            )}
          </div>
        );
      }
      
      if (message.fileType === 'audio') {
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
              <Volume2 className="w-5 h-5 text-primary" />
              <audio controls className="max-w-full h-8">
                <source src={message.fileUrl} type="audio/mpeg" />
                Seu navegador não suporta áudio.
              </audio>
            </div>
            {message.text && message.text !== message.documentName && (
              <p className="text-sm">{message.text}</p>
            )}
          </div>
        );
      }

      // Document
      return (
        <a
          href={message.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline"
        >
          <FileText className="w-5 h-5" />
          <span className="text-sm">{message.text || 'Documento'}</span>
        </a>
      );
    }

    if (message.isDocument && message.documentUrl) {
      return (
        <a
          href={message.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2"
        >
          <FileText className="w-5 h-5" />
          <span className="text-sm underline">{message.documentName}</span>
        </a>
      );
    }

    return <p className="text-sm">{message.text}</p>;
  };

  const Header = (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
        <span className="text-primary-foreground font-semibold">S</span>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-foreground">Suporte</h1>
        <p className="text-xs text-muted-foreground">
          {adminTyping ? 'Digitando...' : 'Online'}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <PageContainer header={Header} className="flex flex-col h-screen">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-24">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Envie uma mensagem para iniciar</p>
            </div>
          )}

          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  message.sender === 'user'
                    ? 'gradient-primary text-primary-foreground rounded-br-md'
                    : 'bg-card text-foreground rounded-bl-md'
                }`}
              >
                {/* Admin sender name */}
                {message.sender === 'admin' && message.senderName && (
                  <p className="text-xs font-semibold text-destructive mb-1">
                    {message.senderName}
                  </p>
                )}
                
                {renderMessageContent(message)}
                
                <div className={`flex items-center gap-1 mt-1 ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                  <span className={`text-[10px] ${
                    message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString('pt-MZ', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {message.sender === 'user' && getStatusIcon(message.status)}
                </div>
              </div>
            </motion.div>
          ))}

          {adminTyping && (
            <div className="flex justify-start">
              <div className="bg-card rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

      </PageContainer>
      
      {/* Fixed Input above BottomNav */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border px-4 py-3 z-40">
        <div className="flex gap-2 max-w-lg mx-auto">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1"
          />
          <Button onClick={sendMessage} size="icon">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      <BottomNav />
    </>
  );
};

export default Support;

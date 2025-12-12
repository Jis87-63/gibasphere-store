import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database, storage } from '@/lib/firebase';
import { ref, onValue, set, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Send, Paperclip, Loader2, Circle, CheckCheck, User, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ChatSession {
  id: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'active' | 'closed';
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  senderName?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'seen';
  fileUrl?: string;
  fileType?: string;
  isPrizeClaim?: boolean;
  prizeId?: string;
}

const AdminChat: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    // Listen to support sessions from all users
    onValue(ref(database, 'supportSessions'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: ChatSession[] = [];
        
        // Iterate through all users
        Object.entries(data).forEach(([userId, userSessions]: [string, any]) => {
          Object.entries(userSessions).forEach(([sessionId, session]: [string, any]) => {
            list.push({
              id: `${userId}/${sessionId}`,
              userName: session.userName || 'Usuário',
              userEmail: session.userEmail || '',
              lastMessage: session.lastMessage || '',
              lastMessageTime: session.lastMessageAt || session.createdAt,
              unreadCount: 0,
              status: session.status || 'active',
            });
          });
        });
        
        setSessions(list.sort((a, b) => 
          new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime()
        ));
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!selectedSession) return;

    const [userId, sessionId] = selectedSession.id.split('/');
    
    const messagesRef = ref(database, `supportMessages/${userId}/${sessionId}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          text: value.text,
          sender: value.sender,
          senderName: value.senderName,
          timestamp: value.createdAt || value.timestamp,
          status: value.status || 'sent',
          fileUrl: value.fileUrl,
          fileType: value.fileType,
          isPrizeClaim: value.isPrizeClaim,
          prizeId: value.prizeId,
        }));
        setMessages(list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
        
        // Mark user messages as seen
        list.forEach((msg) => {
          if (msg.sender === 'user' && msg.status !== 'seen') {
            set(ref(database, `supportMessages/${userId}/${sessionId}/${msg.id}/status`), 'seen');
          }
        });
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [selectedSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSession) return;

    const [userId, sessionId] = selectedSession.id.split('/');

    setSending(true);
    try {
      const messageRef = push(ref(database, `supportMessages/${userId}/${sessionId}`));
      await set(messageRef, {
        text: newMessage,
        sender: 'admin',
        senderName: 'Roleta.winner',
        createdAt: new Date().toISOString(),
        status: 'sent',
      });

      await set(ref(database, `supportSessions/${userId}/${sessionId}/lastMessage`), newMessage);
      await set(ref(database, `supportSessions/${userId}/${sessionId}/lastMessageAt`), new Date().toISOString());
      await set(ref(database, `supportSessions/${userId}/${sessionId}/adminTyping`), false);

      setNewMessage('');
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSession) return;

    const [userId, sessionId] = selectedSession.id.split('/');

    setUploading(true);
    try {
      const fileRef = storageRef(storage, `chat/${userId}/${sessionId}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const messageRef = push(ref(database, `supportMessages/${userId}/${sessionId}`));
      await set(messageRef, {
        text: file.name,
        sender: 'admin',
        senderName: 'Roleta.winner',
        createdAt: new Date().toISOString(),
        status: 'sent',
        fileUrl: url,
        fileType: file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'document',
      });

      await set(ref(database, `supportSessions/${userId}/${sessionId}/lastMessage`), `📎 ${file.name}`);
      await set(ref(database, `supportSessions/${userId}/${sessionId}/lastMessageAt`), new Date().toISOString());

      toast.success('Arquivo enviado!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    }
    setUploading(false);
  };

  const handleTyping = (typing: boolean) => {
    if (!selectedSession) return;
    const [userId, sessionId] = selectedSession.id.split('/');
    set(ref(database, `supportSessions/${userId}/${sessionId}/adminTyping`), typing);
  };

  const handleCopyPrizeCode = (prizeId: string) => {
    navigator.clipboard.writeText(prizeId);
    toast.success('Código copiado!');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const closedSessions = sessions.filter(s => s.status === 'closed');

  return (
    <div className="min-h-screen bg-background safe-top">
      {!selectedSession ? (
        <div className="p-4">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Suporte</h1>
          </div>

          <div className="mb-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              Ativos ({activeSessions.length})
            </h2>
            <div className="space-y-2">
              {activeSessions.map((session) => (
                <motion.button
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedSession(session)}
                  className="w-full bg-card rounded-xl p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground truncate">{session.userName}</h3>
                        {session.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                            {session.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{session.lastMessage}</p>
                      {session.lastMessageTime && (
                        <p className="text-xs text-muted-foreground mt-0.5">{formatTime(session.lastMessageTime)}</p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
              {activeSessions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma conversa ativa
                </p>
              )}
            </div>
          </div>

          {closedSessions.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                Encerrados ({closedSessions.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {closedSessions.slice(0, 5).map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className="w-full bg-card rounded-xl p-4 text-left"
                  >
                    <h3 className="font-medium text-foreground">{session.userName}</h3>
                    <p className="text-sm text-muted-foreground truncate">{session.lastMessage}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-screen">
          {/* Chat Header */}
          <div className="flex items-center gap-3 p-4 bg-card border-b border-border">
            <button onClick={() => setSelectedSession(null)} className="p-2 text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="font-medium text-foreground">{selectedSession.userName}</h2>
              <p className="text-xs text-muted-foreground">{selectedSession.userEmail}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.sender === 'admin' 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-card text-foreground rounded-bl-sm'
                }`}>
                  {/* Prize Claim Badge */}
                  {message.isPrizeClaim && message.prizeId && (
                    <div className="bg-yellow-500/20 text-yellow-500 rounded-lg p-2 mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium">🎁 Prêmio: {message.prizeId}</span>
                      <button 
                        onClick={() => handleCopyPrizeCode(message.prizeId!)}
                        className="p-1 hover:bg-yellow-500/30 rounded"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {message.fileUrl && message.fileType === 'image' ? (
                    <img src={message.fileUrl} alt="Image" className="max-w-full rounded-lg mb-1" />
                  ) : message.fileUrl && message.fileType === 'audio' ? (
                    <audio controls className="max-w-full">
                      <source src={message.fileUrl} type="audio/mpeg" />
                    </audio>
                  ) : message.fileUrl ? (
                    <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline">
                      📎 {message.text}
                    </a>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] opacity-70">{formatTime(message.timestamp)}</span>
                    {message.sender === 'admin' && (
                      message.status === 'seen' ? (
                        <CheckCheck className="w-3 h-3 text-blue-400" />
                      ) : message.status === 'delivered' ? (
                        <CheckCheck className="w-3 h-3 opacity-70" />
                      ) : (
                        <Circle className="w-2 h-2 opacity-70" />
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 bg-card border-t border-border">
            <div className="flex items-center gap-2">
              <label className="p-2 text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,audio/*,.pdf,.doc,.docx" />
              </label>
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping(e.target.value.length > 0);
                }}
                onBlur={() => handleTyping(false)}
                placeholder="Digite sua mensagem..."
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={sending || !newMessage.trim()}
                size="icon"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminChat;

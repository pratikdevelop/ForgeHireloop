import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, MessageSquare, Send, User } from 'lucide-react';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRecipientId?: string;
  targetRecipientName?: string;
}

export const MessagesModal: React.FC<MessagesModalProps> = ({
  isOpen,
  onClose,
  targetRecipientId,
  targetRecipientName,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await api.getMessages();
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !user) return;

    // Determine default recipient
    let recipientId = targetRecipientId;
    if (!recipientId) {
      // Find the other party from the existing messages or fallback
      const otherMsg = messages.find(m => m.senderId !== user.id || m.recipientId !== user.id);
      if (otherMsg) {
        recipientId = otherMsg.senderId === user.id ? otherMsg.recipientId : otherMsg.senderId;
      } else {
        // Fallback default demo recipient
        recipientId = user.role === 'candidate' ? 'usr_employer_1' : 'usr_candidate_1';
      }
    }

    try {
      const sent = await api.sendMessage({
        recipientId,
        content: newText.trim(),
      });
      setMessages([...messages, sent]);
      setNewText('');
    } catch (err) {
      console.error('Failed to send message');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg h-[540px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Direct Messages</h2>
              <p className="text-xs text-slate-500">
                {targetRecipientName ? `Chat with ${targetRecipientName}` : 'Conversations with hiring teams & candidates'}
              </p>
            </div>
          </div>
          <button
            id="close-messages-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
              <MessageSquare className="w-8 h-8 mb-2 stroke-1" />
              <p className="text-xs font-medium">No messages yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Recruiters and candidates can communicate here regarding applications and interviews.
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-slate-400 mb-1 px-1">
                    {msg.senderName} ({msg.senderRole})
                  </span>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      isMine
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
          <input
            id="message-text-input"
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <button
            id="send-message-btn"
            type="submit"
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

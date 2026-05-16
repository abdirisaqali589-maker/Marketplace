import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api-enhanced';
import { useAuthStore } from './auth-store';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  model?: string | null;
  tokens?: number | null;
  thinking?: string | null;
  isThinkingComplete?: boolean;
}

export interface ChatConversation {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: ChatConversation[];
  currentConversationId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  typingText: string;
  thinkingText: string;
  isThinkingExpanded: boolean;
  // Track the currently streaming message ID for UI targeting
  streamingMessageId: string | null;
}

interface ChatActions {
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  sendMessageStream: (content: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearCurrent: () => void;
  appendTyping: (char: string) => void;
  resetTyping: () => void;
  appendThinking: (char: string) => void;
  resetThinking: () => void;
  setThinkingExpanded: (expanded: boolean) => void;
  // New: Update thinking on a specific message for inline display
  updateMessageThinking: (messageId: string, thinking: string, isComplete?: boolean) => void;
  // New: Update content on the streaming message
  updateStreamingMessageContent: (content: string) => void;
}

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      messages: [],
      isLoading: false,
      isStreaming: false,
      error: null,
      typingText: '',
      thinkingText: '',
      isThinkingExpanded: true,
      streamingMessageId: null,

      loadConversations: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.get<{ data: ChatConversation[] }>('/chat/conversations');
          set({ conversations: data.data || [], isLoading: false });
        } catch (err: any) {
          set({ error: err.message || 'Failed to load conversations', isLoading: false });
        }
      },

      createConversation: async (title?: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post<{ data: ChatConversation }>('/chat/conversations', { title: title || 'New Conversation' });
          const newConv = data.data;
          set(state => ({
            conversations: [newConv, ...state.conversations],
            currentConversationId: newConv.id,
            messages: [],
            isLoading: false,
            typingText: '',
            thinkingText: '',
            streamingMessageId: null,
          }));
        } catch (err: any) {
          set({ error: err.message || 'Failed to create conversation', isLoading: false });
          throw err;
        }
      },

      selectConversation: async (id: string) => {
        set({ 
          isLoading: true, 
          currentConversationId: id, 
          messages: [], 
          error: null, 
          typingText: '', 
          thinkingText: '',
          streamingMessageId: null,
        });
        try {
          const { data } = await api.get<{ data: { messages: ChatMessage[] } }>(`/chat/conversations/${id}`);
          const conv = (data as any).data;
          set({ messages: conv.messages || [], isLoading: false });
          if (conv.title) {
            set(state => ({
              conversations: state.conversations.map(c =>
                c.id === id ? { ...c, title: conv.title } : c
              ),
            }));
          }
        } catch (err: any) {
          set({ error: err.message || 'Failed to load conversation', isLoading: false });
        }
      },

      sendMessage: async (content: string) => {
        const { currentConversationId, messages } = get();
        if (!currentConversationId) throw new Error('No active conversation');

        const userMsg: ChatMessage = { 
          id: `temp-${Date.now()}`, 
          role: 'user', 
          content, 
          createdAt: new Date().toISOString() 
        };
        set(state => ({ 
          messages: [...state.messages, userMsg], 
          isLoading: true, 
          error: null 
        }));

        try {
          const { data } = await api.post<{ data: ChatMessage }>(`/chat/conversations/${currentConversationId}/ai`, { message: content });
          let rawContent = data.data?.content || '';
          let extractedThinking = '';

          const titleMatch = rawContent.match(/<title>(.*?)<\/title>/);
          if (titleMatch) {
            const title = titleMatch[1].trim();
            if (title) {
              set(state => ({
                conversations: state.conversations.map(c =>
                  c.id === currentConversationId ? { ...c, title } : c
              ),
              }));
            }
          }
          const thinkingMatch = rawContent.match(/<thinking>(.*?)<\/thinking>/);
          if (thinkingMatch) {
            extractedThinking = thinkingMatch[1].trim();
          }
          
          const displayContent = rawContent
            .replace(/<title>.*?<\/title>/g, '')
            .replace(/<thinking>.*?<\/thinking>/g, '')
            .replace(/<\/?answer>/g, '')
            .trim();

          const aiMsg: ChatMessage = {
            ...data.data,
            content: displayContent || data.data.content,
            thinking: extractedThinking || data.data.thinking || null,
            isThinkingComplete: true,
          };
          set(state => ({ messages: [...state.messages, aiMsg], isLoading: false }));
          get().loadConversations();
        } catch (err: any) {
          set(state => ({
            messages: state.messages.filter(m => m.id !== userMsg.id),
            error: err.message || 'Failed to get AI response',
            isLoading: false
          }));
          throw err;
        }
      },

      sendMessageStream: async (content: string) => {
        const { currentConversationId } = get();
        if (!currentConversationId) throw new Error('No active conversation');

        const userMsg: ChatMessage = {
          id: `temp-${Date.now()}`,
          role: 'user' as const,
          content,
          createdAt: new Date().toISOString()
        };
        
        // Create the AI message placeholder upfront for inline thinking
        const aiMessageId = `ai-${Date.now()}`;
        const aiPlaceholder: ChatMessage = {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          thinking: '',
          createdAt: new Date().toISOString(),
          isThinkingComplete: false,
        };

        set(state => ({
          messages: [...state.messages, userMsg, aiPlaceholder],
          isStreaming: true,
          typingText: '',
          thinkingText: '',
          isThinkingExpanded: true,
          streamingMessageId: aiMessageId,
        }));

        try {
          const token = useAuthStore.getState().accessToken;

          // Use GET with query param for SSE streaming (backend sends SSE only for GET)
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/chat/conversations/${currentConversationId}/ai/stream?message=${encodeURIComponent(content)}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'text/event-stream',
              },
            }
          );

          if (!response.ok) {
            // Remove placeholder and fallback
            set(state => ({
              isStreaming: false,
              typingText: '',
              thinkingText: '',
              streamingMessageId: null,
              messages: state.messages.filter(m => m.id !== userMsg.id && m.id !== aiMessageId),
            }));
            
            try {
              await get().sendMessage(content);
            } catch (fallbackErr: any) {
              set({
                error: fallbackErr.message?.includes('502')
                  ? 'The AI service is currently unavailable. Please check your AI provider configuration in Admin > AI Providers.'
                  : 'Sorry, I had trouble connecting. Please try again or contact support.',
                isLoading: false,
              });
            }
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let fullContent = '';
          let fullThinking = '';
          let extractedTitle = '';
          let titleExtracted = false;
          let buffer = '';
          
          let inTag: 'title' | 'thinking' | 'answer' | null = null;
          let tagBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (!dataStr || dataStr === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(dataStr);

                  // Handle thinking stream from server - update inline on the message
                  if (parsed.type === 'thinking' && parsed.thinking) {
                    fullThinking = parsed.fullThinking || (fullThinking + parsed.thinking);
                    
                    // Update both global state (for compatibility) and message inline
                    set(state => ({
                      thinkingText: fullThinking,
                      messages: state.messages.map(m => 
                        m.id === aiMessageId 
                          ? { ...m, thinking: fullThinking, isThinkingComplete: false }
                          : m
                      ),
                    }));
                    continue;
                  }

                  // Handle content stream from server
                  if (parsed.type === 'content' && parsed.content) {
                    const token = parsed.content;
                    
                    for (let i = 0; i < token.length; i++) {
                      const char = token[i];
                      const remaining = token.slice(i);

                      if (inTag === null) {
                        if (char === '<') {
                          if (remaining.startsWith('<title>') && !titleExtracted) {
                            inTag = 'title';
                            tagBuffer = '';
                            i += '<title>'.length - 1;
                            continue;
                          } else if (remaining.startsWith('<thinking>')) {
                            inTag = 'thinking';
                            tagBuffer = '';
                            i += '<thinking>'.length - 1;
                            continue;
                          } else if (remaining.startsWith('<answer>')) {
                            inTag = 'answer';
                            tagBuffer = '';
                            i += '<answer>'.length - 1;
                            continue;
                          } else {
                            fullContent += char;
                          }
                        } else {
                          fullContent += char;
                        }
                      } else {
                        let closingTag = '';
                        if (inTag === 'title') closingTag = '</title>';
                        else if (inTag === 'thinking') closingTag = '</thinking>';
                        else if (inTag === 'answer') closingTag = '</answer>';

                        if (remaining.startsWith(closingTag)) {
                          const tagContent = tagBuffer;

                          if (inTag === 'title' && !titleExtracted) {
                            extractedTitle = tagContent.trim();
                            titleExtracted = true;
                            if (extractedTitle) {
                              set(state => ({
                                conversations: state.conversations.map(c =>
                                  c.id === currentConversationId ? { ...c, title: extractedTitle } : c
                                ),
                              }));
                            }
                          } else if (inTag === 'thinking') {
                            fullThinking = tagContent;
                            set(state => ({
                              thinkingText: fullThinking,
                              messages: state.messages.map(m => 
                                m.id === aiMessageId 
                                  ? { ...m, thinking: fullThinking }
                                  : m
                              ),
                            }));
                          }

                          inTag = null;
                          tagBuffer = '';
                          i += closingTag.length - 1;
                        } else {
                          tagBuffer += char;
                          if (inTag === 'answer') {
                            fullContent += char;
                          }
                        }
                      }
                    }

                    const displayContent = fullContent
                      .replace(/<title>[\s\S]*?<\/title>/g, '')
                      .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
                      .replace(/<\/?answer>/g, '')
                      .trim();
                    
                    // Update both global typingText and message content inline
                    set(state => ({
                      typingText: displayContent,
                      messages: state.messages.map(m => 
                        m.id === aiMessageId 
                          ? { ...m, content: displayContent }
                          : m
                      ),
                    }));
                  }

                  // Final message handling
                  if (parsed.done || parsed.type === 'done') {
                    const finalContent = parsed.fullContent || fullContent;
                    const finalThinking = parsed.fullThinking || fullThinking;

                    const cleanContent = finalContent
                      .replace(/<title>[\s\S]*?<\/title>/g, '')
                      .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
                      .replace(/<\/?answer>/g, '')
                      .trim();

                    const cleanThinking = finalThinking
                      .replace(/<title>[\s\S]*?<\/title>/g, '')
                      .trim();

                    // Finalize the message inline
                    set(state => ({
                      messages: state.messages.map(m => 
                        m.id === aiMessageId 
                          ? {
                              ...m,
                              content: cleanContent,
                              thinking: cleanThinking || null,
                              isThinkingComplete: true,
                              model: parsed.model || null,
                              tokens: parsed.tokens || null,
                            }
                          : m
                      ),
                      isStreaming: false,
                      typingText: '',
                      thinkingText: '',
                      streamingMessageId: null,
                    }));
                    get().loadConversations();
                  }

                  if (parsed.type === 'error') {
                    set(state => ({
                      messages: state.messages.filter(m => m.id !== aiMessageId),
                      isStreaming: false,
                      error: parsed.error || 'Streaming error',
                      typingText: '',
                      thinkingText: '',
                      streamingMessageId: null,
                    }));
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }

          // Fallback: if no done signal but we have content
          if (fullContent && !get().messages.find(m => m.id === aiMessageId)?.content) {
            const cleanContent = fullContent
              .replace(/<title>[\s\S]*?<\/title>/g, '')
              .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
              .replace(/<\/?answer>/g, '')
              .trim();

            set(state => ({
              messages: state.messages.map(m => 
                m.id === aiMessageId 
                  ? {
                      ...m,
                      content: cleanContent,
                      thinking: fullThinking || null,
                      isThinkingComplete: true,
                    }
                  : m
              ),
              isStreaming: false,
              typingText: '',
              thinkingText: '',
              streamingMessageId: null,
            }));
            get().loadConversations();
          }
        } catch (err: any) {
          set(state => ({
            messages: state.messages.filter(m => m.id !== aiMessageId),
            isStreaming: false,
            error: err.message || 'Streaming failed',
            typingText: '',
            thinkingText: '',
            streamingMessageId: null,
          }));
        }
      },

      deleteConversation: async (id: string) => {
        try {
          await api.patch(`/chat/conversations/${id}/archive`);
          set(state => ({
            conversations: state.conversations.filter(c => c.id !== id),
            currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
            messages: state.currentConversationId === id ? [] : state.messages,
            streamingMessageId: state.currentConversationId === id ? null : state.streamingMessageId,
          }));
        } catch (err: any) {
          set({ error: err.message || 'Failed to delete conversation' });
        }
      },

      clearCurrent: () => {
        set({ 
          currentConversationId: null, 
          messages: [], 
          typingText: '', 
          thinkingText: '',
          streamingMessageId: null,
        });
      },

      appendTyping: (char: string) => {
        set(state => ({ typingText: state.typingText + char }));
      },

      resetTyping: () => {
        set({ typingText: '' });
      },

      appendThinking: (char: string) => {
        set(state => ({ thinkingText: state.thinkingText + char }));
      },

      resetThinking: () => {
        set({ thinkingText: '' });
      },

      setThinkingExpanded: (expanded: boolean) => {
        set({ isThinkingExpanded: expanded });
      },

      // New action: Update thinking on a specific message
      updateMessageThinking: (messageId: string, thinking: string, isComplete = false) => {
        set(state => ({
          messages: state.messages.map(m => 
            m.id === messageId 
              ? { ...m, thinking, isThinkingComplete: isComplete }
              : m
          ),
        }));
      },

      // New action: Update content on streaming message
      updateStreamingMessageContent: (content: string) => {
        const { streamingMessageId } = get();
        if (!streamingMessageId) return;
        
        set(state => ({
          messages: state.messages.map(m => 
            m.id === streamingMessageId 
              ? { ...m, content }
              : m
          ),
        }));
      },
    }),
    {
      name: 'marketplace-chat',
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
    }
  )
);

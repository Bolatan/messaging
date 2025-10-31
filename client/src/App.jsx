import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Send, Phone, Video, MoreVertical, Search, Paperclip, Smile, Mic, ArrowLeft, Check, CheckCheck, User, Users } from 'lucide-react';
import io from 'socket.io-client';
import WebGLAnimation from './components/WebGLAnimation';
import RegistrationForm from './components/RegistrationForm';
import { gsap } from 'gsap';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const WhatsAppClone = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const main = useRef();

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
    });

    socketRef.current.on('message:receive', (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
      updateChatLastMessage(newMessage);
    });

    socketRef.current.on('message:status', (data) => {
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId ? { ...msg, status: data.status } : msg
      ));
    });

    socketRef.current.on('messages:read', (messageIds) => {
      setMessages(prev => prev.map(msg =>
        messageIds.includes(msg._id) ? { ...msg, status: 'read' } : msg
      ));
    });

    socketRef.current.on('typing:display', (data) => {
      setIsTyping(true);
    });

    socketRef.current.on('typing:hide', (data) => {
      setIsTyping(false);
    });

    socketRef.current.on('user:status', (data) => {
      setChats(prev => prev.map(chat => ({
        ...chat,
        participants: chat.participants?.map(p =>
          p._id === data.userId ? { ...p, online: data.online } : p
        )
      })));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Initialize user and load data
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // In production, you'd get this from login/auth
      let user = JSON.parse(localStorage.getItem('currentUser'));

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      socketRef.current?.emit('user:online', user.id);

      // Load users and chats
      await Promise.all([loadUsers(), loadChats(user.id)]);
      setLoading(false);
    } catch (error) {
      console.error('Error initializing app:', error);
      setLoading(false);
    }
  };

  const handleRegister = async (registrationData) => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed.');
      }

      const user = await response.json();
      localStorage.setItem('currentUser', JSON.stringify(user));
      await initializeApp();
    } catch (error) {
      console.error('Error registering user:', error);
      // You might want to display this error to the user
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadChats = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/chats/${userId}`);
      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const response = await fetch(`${API_URL}/api/messages/${chatId}`);
      const data = await response.json();
      setMessages(data);
      
      // Mark messages as read
      const unreadMessages = data.filter(m => 
        m.senderId._id !== currentUser.id && m.status !== 'read'
      );
      if (unreadMessages.length > 0) {
        socketRef.current?.emit('message:read', {
          chatId,
          messageIds: unreadMessages.map(m => m._id)
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createOrOpenChat = async (otherUser) => {
    try {
      const response = await fetch(`${API_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: [currentUser.id, otherUser._id],
          isGroup: false
        })
      });
      const chat = await response.json();
      
      if (!chats.find(c => c._id === chat._id)) {
        setChats(prev => [chat, ...prev]);
      }
      
      handleSelectChat(chat);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    socketRef.current?.emit('chat:join', chat._id);
    loadMessages(chat._id);
  };

  const updateChatLastMessage = (newMessage) => {
    setChats(prev => prev.map(chat =>
      chat._id === newMessage.chatId
        ? { ...chat, lastMessage: newMessage, updatedAt: new Date() }
        : chat
    ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
  };

  const handleSendMessage = () => {
    if (message.trim() && selectedChat && currentUser) {
      socketRef.current?.emit('message:send', {
        chatId: selectedChat._id,
        senderId: currentUser.id,
        text: message.trim()
      });

      setMessage('');
      socketRef.current?.emit('typing:stop', {
        chatId: selectedChat._id,
        userId: currentUser.id
      });
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (e.target.value && selectedChat) {
      socketRef.current?.emit('typing:start', {
        chatId: selectedChat._id,
        userId: currentUser.id,
        userName: currentUser.name
      });

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('typing:stop', {
          chatId: selectedChat._id,
          userId: currentUser.id
        });
      }, 1000);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getOtherParticipant = (chat) => {
    if (chat.isGroup) return null;
    return chat.participants?.find(p => p._id !== currentUser?.id);
  };

  const getChatDisplay = (chat) => {
    if (chat.isGroup) {
      return {
        name: chat.groupName,
        avatar: <Users className="w-full h-full" />,
        online: false
      };
    }
    const other = getOtherParticipant(chat);
    return {
      name: other?.name || 'Unknown',
      avatar: <User className="w-full h-full" />,
      online: other?.online || false
    };
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const filteredChats = chats.filter(chat => {
    const display = getChatDisplay(chat);
    return display.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  useLayoutEffect(() => {
    if (!main.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.chat-item', {
        duration: 0.5,
        opacity: 0,
        y: 20,
        stagger: 0.1,
        ease: 'power3.out',
      });
    }, main);
    return () => ctx.revert();
  }, [filteredChats]);

  const availableUsers = users.filter(u => 
    u._id !== currentUser?.id &&
    !chats.some(chat => 
      !chat.isGroup && chat.participants?.some(p => p._id === u._id)
    )
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4"><User className="w-full h-full text-gray-400" /></div>
          <p className="text-gray-600">Loading NaijaChat...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <RegistrationForm onRegister={handleRegister} />;
  }

  return (
    <div className="flex h-screen" ref={main}>
      <WebGLAnimation />
      {/* Sidebar */}
      <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 bg-white border-r border-gray-200`}>
        {/* Header */}
        <div className="bg-green-600 p-4 text-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">NaijaChat</h1>
            <div className="flex gap-4">
              <MoreVertical className="w-5 h-5 cursor-pointer" />
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-gray-800 focus:outline-none"
            />
          </div>
        </div>

        {/* New Chats Section */}
        {availableUsers.length > 0 && (
          <div className="bg-green-50 p-3">
            <p className="text-xs text-green-800 font-semibold mb-2">START NEW GIST</p>
            <div className="space-y-1">
              {availableUsers.slice(0, 3).map(user => (
                <div
                  key={user._id}
                  onClick={() => createOrOpenChat(user)}
                  className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-lg">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-700">{user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map(chat => {
            const display = getChatDisplay(chat);
            return (
              <div
                key={chat._id}
                onClick={() => handleSelectChat(chat)}
                className={`chat-item flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedChat?._id === chat._id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-2xl">
                    {display.avatar}
                  </div>
                  {display.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-gray-900 truncate">{display.name}</h3>
                    <span className="text-xs text-gray-500">
                      {chat.lastMessage ? formatTime(chat.updatedAt) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {chat.lastMessage?.text || 'Start a conversation'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedChat ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xl">
                    {getChatDisplay(selectedChat).avatar}
                  </div>
                  {getChatDisplay(selectedChat).online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{getChatDisplay(selectedChat).name}</h2>
                  <p className="text-xs text-gray-500">
                    {isTyping ? 'dey type...' : getChatDisplay(selectedChat).online ? 'online' : 'offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-6">
                <Video className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <Phone className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <MoreVertical className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-green-50">
              {messages.map(msg => {
                const isSent = msg.senderId._id === currentUser?.id;
                return (
                  <div
                    key={msg._id}
                    className={`message-item flex mb-4 ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isSent
                          ? 'bg-green-500 text-white rounded-br-none'
                          : 'bg-white text-gray-800 rounded-bl-none'
                      } shadow`}
                    >
                      {selectedChat.isGroup && !isSent && (
                        <p className="text-xs font-semibold text-green-600 mb-1">
                          {msg.senderId.name}
                        </p>
                      )}
                      <p className="break-words">{msg.text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={`text-xs ${isSent ? 'text-green-100' : 'text-gray-500'}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {isSent && (
                          <span>
                            {msg.status === 'read' && <CheckCheck className="w-4 h-4 text-blue-300" />}
                            {msg.status === 'delivered' && <CheckCheck className="w-4 h-4 text-green-100" />}
                            {msg.status === 'sent' && <Check className="w-4 h-4 text-green-100" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-gray-50 border-t border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-200 rounded-full">
                  <Smile className="w-6 h-6 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-200 rounded-full">
                  <Paperclip className="w-6 h-6 text-gray-600" />
                </button>
                
                <input
                  type="text"
                  placeholder="Send message"
                  value={message}
                  onChange={handleTyping}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-green-500"
                />
                
                {message.trim() ? (
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-green-500 hover:bg-green-600 rounded-full"
                  >
                    <Send className="w-6 h-6 text-white" />
                  </button>
                ) : (
                  <button className="p-2 hover:bg-gray-200 rounded-full">
                    <Mic className="w-6 h-6 text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-green-50">
            <div className="text-center">
              <div className="w-64 h-64 mx-auto mb-8 rounded-full bg-green-100 flex items-center justify-center">
                <User className="w-32 h-32 text-gray-400" />
              </div>
              <h2 className="text-3xl font-light text-gray-600 mb-2">NaijaChat</h2>
              <p className="text-gray-500">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppClone;
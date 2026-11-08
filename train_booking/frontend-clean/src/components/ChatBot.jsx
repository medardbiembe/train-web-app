// ChatBot.js
import React, { useState, useRef, useEffect } from 'react';
import '../styles/ChatBot.css';

const ChatBot = ({ user }) => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Bonjour ! Je suis l'assistant VoyageurX. Comment puis-je vous aider avec vos voyages en train ?", 
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll automatique vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus sur l'input quand le chat s'ouvre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Fonction pour envoyer un message
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    const newUserMessage = {
      id: messages.length + 1,
      text: userMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const payload = {
        message: userMessage,
        session_id: sessionId
      };

      console.log('📤 Envoi message:', payload);

      const response = await fetch('http://localhost:8000/api/chatbot/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('📥 Réponse:', data);

      if (response.ok) {
        // Sauvegarder la session pour la conversation
        if (data.session_id && !sessionId) {
          setSessionId(data.session_id);
        }

        const botMessage = {
          id: messages.length + 2,
          text: data.reply,
          sender: 'bot',
          timestamp: new Date(),
          usingGpt4All: data.using_gpt4all
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Erreur de communication');
      }
    } catch (error) {
      console.error('❌ Erreur chatbot:', error);
      
      const errorMessage = {
        id: messages.length + 2,
        text: "Désolé, je rencontre des difficultés techniques. Veuillez réessayer.",
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion de la touche Entrée
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Suggérer des questions rapides
  const quickQuestions = [
    { text: "Quels sont les trains disponibles ?", icon: "🚆" },
    { text: "Comment réserver un billet ?", icon: "🎫" },
    { text: "Quelles sont les gares ?", icon: "🏢" },
    { text: "Prix des billets ?", icon: "💰" },
  ];

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
    setTimeout(() => sendMessage(), 100);
  };

  // Formater l'heure
  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Réinitialiser la conversation
  const resetConversation = () => {
    setMessages([
      { 
        id: 1, 
        text: "Bonjour ! Je suis l'assistant VoyageurX. Comment puis-je vous aider avec vos voyages en train ?", 
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
    setSessionId(null);
  };

  return (
    <>
      {/* Bouton flottant pour ouvrir/fermer le chat */}
      <button 
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Assistant virtuel"
      >
        {isOpen ? (
          <i className="fas fa-times"></i>
        ) : (
          <>
            <i className="fas fa-robot"></i>
            <span className="chatbot-notification">1</span>
          </>
        )}
      </button>

      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="chatbot-container">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <i className="fas fa-robot"></i>
              </div>
              <div>
                <h3>Assistant VoyageurX</h3>
                <p className="chatbot-status">
                  <span className="status-dot"></span>
                  En ligne
                </p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button 
                className="chatbot-reset"
                onClick={resetConversation}
                title="Nouvelle conversation"
              >
                <i className="fas fa-redo-alt"></i>
              </button>
              <button 
                className="chatbot-close"
                onClick={() => setIsOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`message ${msg.sender === 'user' ? 'user-message' : 'bot-message'} ${msg.isError ? 'error-message' : ''}`}
              >
                {msg.sender === 'bot' && (
                  <div className="message-avatar">
                    <i className="fas fa-robot"></i>
                  </div>
                )}
                <div className="message-content">
                  <div className="message-text">{msg.text}</div>
                  <div className="message-time">{formatTime(msg.timestamp)}</div>
                  {msg.usingGpt4All && (
                    <div className="message-badge">IA</div>
                  )}
                </div>
                {msg.sender === 'user' && (
                  <div className="message-avatar user-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="message bot-message">
                <div className="message-avatar">
                  <i className="fas fa-robot"></i>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Questions rapides */}
          <div className="chatbot-quick-questions">
            {quickQuestions.map((q, index) => (
              <button
                key={index}
                className="quick-question-btn"
                onClick={() => handleQuickQuestion(q.text)}
                disabled={isLoading}
              >
                <span>{q.icon}</span>
                {q.text}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="chatbot-input-area">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Écrivez votre message..."
              disabled={isLoading}
              className="chatbot-input"
            />
            <button 
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="chatbot-send-btn"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>

          {/* Footer */}
          <div className="chatbot-footer">
            <p>Powered by VoyageurX AI</p>
            {!user && (
              <p className="chatbot-login-prompt">
                <i className="fas fa-info-circle"></i>
                Connectez-vous pour des réponses personnalisées
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
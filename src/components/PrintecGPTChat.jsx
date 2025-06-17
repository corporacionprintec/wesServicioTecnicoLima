import React, { useState, useRef } from 'react';

// Puedes cambiar el ícono SVG por uno de tu preferencia
const chatIcon = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

const PrintecGPTChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy PrintecGPT 🤖. Pregúntame sobre mantenimiento de impresoras.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll automático al fondo
  React.useEffect(() => {
    if (open && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(msgs => [...msgs, userMsg]);
    setInput('');
    setLoading(true);
    try {
      // Llama a la API de Groq aquí (endpoint y key)
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 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'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // Cambiado a modelo Groq seguro
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          max_tokens: 256,
          temperature: 0.2
        })
      });
      // Para depuración, imprime el body enviado
      // console.log(JSON.stringify({
      //   model: 'llama3-8b-8192',
      //   messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
      //   max_tokens: 256,
      //   temperature: 0.2
      // }));
      const data = await res.json();
      const aiMsg = data.choices?.[0]?.message?.content || 'Lo siento, no pude responder en este momento.';
      setMessages(msgs => [...msgs, { role: 'assistant', content: aiMsg }]);
    } catch (err) {
      setMessages(msgs => [...msgs, { role: 'assistant', content: 'Error al conectar con PrintecGPT.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón flotante único, solo el ícono, tanto en móvil como escritorio */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 9999,
            background: '#fff',
            border: '3px solid #2563eb',
            borderRadius: '50%',
            width: window.innerWidth < 768 ? 38 : 54,
            height: window.innerWidth < 768 ? 38 : 54,
            boxShadow: '0 2px 12px #2563eb55',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
          title="PrintecGPT"
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={window.innerWidth < 768 ? 20 : 28} height={window.innerWidth < 768 ? 20 : 28} viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="#2563eb" strokeWidth="4" fill="#fff" />
              <rect x="20" y="22" width="24" height="20" rx="5" stroke="#2563eb" strokeWidth="4" fill="#fff" />
              <rect x="26" y="28" width="12" height="8" rx="2" fill="#2563eb" />
            </svg>
          </span>
        </button>
      )}
      {/* Ventana de chat */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: window.innerWidth < 768 ? 0 : 110,
          right: window.innerWidth < 768 ? 0 : 32,
          left: window.innerWidth < 768 ? 0 : 'auto',
          width: window.innerWidth < 768 ? '100vw' : 340,
          maxWidth: '100vw',
          height: window.innerWidth < 768 ? '55vh' : 420,
          background: '#fff',
          border: '2px solid #2563eb',
          borderRadius: window.innerWidth < 768 ? '18px 18px 0 0' : 18,
          boxShadow: '0 4px 24px #2563eb33',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          // Corrige la posición en escritorio para que quede pegado abajo
          ...(window.innerWidth >= 768 ? { bottom: 32 } : {}),
        }}>
          <div style={{
            background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
            color: '#fff',
            borderRadius: '16px 16px 0 0',
            padding: '14px 18px',
            fontWeight: 700,
            fontSize: 19,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <span style={{ fontSize: 22, background: '#fff', borderRadius: '50%', padding: 2, marginRight: 6 }}>{chatIcon}</span>
            PrintecGPT
            <span style={{ flex: 1 }} />
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }} title="Cerrar">×</button>
          </div>
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', maxHeight: 320, minHeight: 120, background: '#f8fafc' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                marginBottom: 10,
                textAlign: msg.role === 'user' ? 'right' : 'left',
              }}>
                <span style={{
                  display: 'inline-block',
                  background: msg.role === 'user' ? '#2563eb' : '#e0e7ff',
                  color: msg.role === 'user' ? '#fff' : '#1e293b',
                  borderRadius: 12,
                  padding: '8px 14px',
                  fontSize: 15,
                  maxWidth: 220,
                  wordBreak: 'break-word',
                  boxShadow: msg.role === 'user' ? '0 1px 4px #2563eb33' : 'none',
                }}>
                  {msg.content}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendMessage} style={{ display: 'flex', borderTop: '1.5px solid #e0e7ff', background: '#fff', borderRadius: '0 0 16px 16px' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe tu consulta sobre impresoras..."
              style={{ flex: 1, border: 'none', outline: 'none', padding: 12, fontSize: 15, borderRadius: '0 0 0 16px', background: '#f1f5f9' }}
              disabled={loading}
              autoFocus
            />
            <button type="submit" disabled={loading || !input.trim()} style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '0 0 16px 0',
              padding: '0 18px',
              fontWeight: 700,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}>
              {loading ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default PrintecGPTChat;

import React, { useState } from 'react';

const ClipboardButton = ({ text, icon = '📋', label = 'Copiar enlace' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setCopied(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? '#d1fae5' : '#f3f4f6',
        color: '#2563eb',
        border: '1.5px solid #60a5fa',
        borderRadius: 6,
        padding: '0.4em 0.8em',
        fontWeight: 600,
        fontSize: 15,
        cursor: 'pointer',
        marginLeft: 8,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }}
      title={label}
    >
      <span>{icon}</span>
      {copied ? '¡Copiado!' : label}
    </button>
  );
};

export default ClipboardButton;

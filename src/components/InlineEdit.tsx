import React, { useState, useEffect, useRef } from 'react';

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}

export default function InlineEdit({ 
  value, 
  onSave, 
  placeholder = "Düzenlemek için tıklayın", 
  multiline = false,
  className = ""
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() !== value.trim()) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && multiline && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full p-2 border border-blue-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
          rows={Math.min(Math.max(editValue.split('\n').length, 2), 6)}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full p-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition-colors ${className} ${
        !value || value.trim() === '' ? 'text-gray-400 italic' : ''
      }`}
      title="Düzenlemek için tıklayın"
    >
      {value || placeholder}
    </div>
  );
}

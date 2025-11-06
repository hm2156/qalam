'use client';
import { useRef, useEffect } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void; // optional, triggers on Ctrl/Cmd+Enter
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  maxLength?: number;
};

export default function RTLContentEditable({
  value,
  onChange,
  onSubmit,
  placeholder = 'اكتب هنا…',
  className = '',
  autoFocus,
  maxLength,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Keep DOM in sync when parent value changes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const text = el.innerText.replace(/\r\n/g, '\n');
    if (text !== value) {
      el.innerText = value;
      placeCaretAtEnd(el);
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && ref.current) placeCaretAtEnd(ref.current);
  }, [autoFocus]);

  const handleInput = () => {
    const el = ref.current;
    if (!el) return;
    // Normalize newlines: contenteditable uses <div><br></div> etc.
    const text = el.innerText.replace(/\r\n/g, '\n');
    if (maxLength && text.length > maxLength) {
      el.innerText = text.slice(0, maxLength);
      placeCaretAtEnd(el);
      onChange(text.slice(0, maxLength));
    } else {
      onChange(text);
    }
  };

  const handlePaste: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, plain);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    // Submit on Ctrl/Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
      return;
    }
    // Enter => newline, Shift+Enter => newline (default), prevent <div> nesting weirdness
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  };

  return (
    <div
      ref={ref}
      role="textbox"
      contentEditable
      suppressContentEditableWarning
      dir="rtl"
      lang="ar"
      // plaintext keeps bidi sane with mixed Arabic/Latin
      style={{ unicodeBidi: 'plaintext' }}
      data-placeholder={placeholder}
      className={
        `rtl-ce min-h-[3rem] w-full rounded-lg border border-gray-300 p-3 text-sm outline-none
         focus:border-black whitespace-pre-wrap break-words ${className}`
      }
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
    />
  );
}

// Util: move caret to end after programmatic changes
function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}


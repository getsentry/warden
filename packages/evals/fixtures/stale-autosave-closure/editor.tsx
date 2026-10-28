import { useEffect, useState } from 'react';

interface AutoSaveEditorProps {
  documentId: string;
  initialText: string;
  saveDocument: (documentId: string, text: string) => Promise<void>;
}

/**
 * Saves the latest editor text every five seconds.
 */
export function AutoSaveEditor({
  documentId,
  initialText,
  saveDocument,
}: AutoSaveEditorProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void saveDocument(documentId, text);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [documentId, saveDocument]);

  return (
    <textarea
      aria-label="Document body"
      value={text}
      onChange={(event) => setText(event.target.value)}
    />
  );
}

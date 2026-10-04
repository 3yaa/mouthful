import { useRef, useLayoutEffect, useCallback, useState } from "react";

interface AutoTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onInput"> {
  minHeight?: number;
  maxHeight?: number;
}

export function AutoTextarea({
  value,
  onChange,
  onKeyDown,
  minHeight = 0,
  maxHeight = 400,
  className = "",
  ...props
}: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const adjustHeight = useCallback(() => {
    const textarea = ref.current;
    if (!textarea) return;

    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = "auto";

    // Calculate new height based on content
    const currentHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(currentHeight, minHeight), maxHeight);
    const willOverflow = currentHeight > maxHeight;

    // Apply height change
    textarea.style.height = `${newHeight}px`;
    setIsOverflowing(willOverflow);
  }, [maxHeight, minHeight]);

  // Adjust height when value changes
  useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
    },
    [onChange]
  );

  // Handle input with minimal interference
  const handleInput = useCallback(() => {
    // Let the browser handle the typing naturally, then adjust height
    requestAnimationFrame(() => {
      adjustHeight();
    });
  }, [adjustHeight]);

  // Handle key events to ensure proper behavior
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // For Enter key, let browser handle scroll naturally
      if (e.key === "Enter") {
        // Don't interfere - let browser scroll to cursor automatically
        setTimeout(() => adjustHeight(), 0);
      }
      onKeyDown?.(e);
    },
    [adjustHeight, onKeyDown]
  );

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      rows={1}
      style={{
        minHeight: `${minHeight}px`,
        maxHeight: `${maxHeight}px`,
        paddingBottom: isOverflowing ? "1.25rem" : undefined,
        boxSizing: "border-box",
        // Let overflow be visible during typing
        overflowY: isOverflowing ? "auto" : "hidden",
      }}
      className={`w-full resize-none bg-transparent outline-none text-gray-300 text-md ${className}`}
      {...props}
    />
  );
}

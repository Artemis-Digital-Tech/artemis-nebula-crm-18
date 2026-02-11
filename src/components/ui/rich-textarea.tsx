import * as React from "react";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextareaProps extends Omit<TextareaProps, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  classNameWrapper?: string;
}

export const RichTextarea = React.forwardRef<HTMLTextAreaElement, RichTextareaProps>(
  ({ value, onChange, className, classNameWrapper, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);
    const mergedRef = (node: HTMLTextAreaElement) => {
      internalRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    };

    const insertToken = (token: string) => {
      const textarea = internalRef.current;
      if (!textarea) {
        onChange(value + token);
        return;
      }

      const start = textarea.selectionStart ?? value.length;
      const end = textarea.selectionEnd ?? value.length;

      const newValue = value.slice(0, start) + token + value.slice(end);
      onChange(newValue);

      // reposiciona o cursor após o token
      requestAnimationFrame(() => {
        textarea.focus();
        const cursor = start + token.length;
        textarea.setSelectionRange(cursor, cursor);
      });
    };

    return (
      <div className={cn("space-y-1.5", classNameWrapper)}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Inserir marcador:</span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-6 px-2 text-[11px]"
            onClick={() => insertToken("{name}")}
          >
            {`{name}`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-6 px-2 text-[11px]"
            onClick={() => insertToken("{organization}")}
          >
            {`{organization}`}
          </Button>
        </div>
        <Textarea
          ref={mergedRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          {...props}
        />
      </div>
    );
  },
);

RichTextarea.displayName = "RichTextarea";


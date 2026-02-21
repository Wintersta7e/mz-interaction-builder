import { useDebouncedSync } from "../hooks/useDebouncedSync";

export function DebouncedInput({
  value,
  onChange,
  type = "text",
  className,
  placeholder,
  min,
  max,
}: {
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  const { localValue, setLocalValue, flush } = useDebouncedSync(
    String(value ?? ""),
    onChange,
    300,
  );
  return (
    <input
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={flush}
      className={className}
      placeholder={placeholder}
      min={min}
      max={max}
    />
  );
}

export function DebouncedTextarea({
  value,
  onChange,
  className,
  rows,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  rows?: number;
  placeholder?: string;
}) {
  const { localValue, setLocalValue, flush } = useDebouncedSync(
    value,
    onChange,
    300,
  );
  return (
    <textarea
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={flush}
      className={className}
      rows={rows}
      placeholder={placeholder}
    />
  );
}

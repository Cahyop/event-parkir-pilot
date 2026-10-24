import { useRef } from "react";
import { X } from "lucide-react";

import { normalizePlate } from "@/lib/parking";

interface PlateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function PlateInput({
  value,
  onChange,
  placeholder = "B 1234 ABC",
  autoFocus = true,
}: PlateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(normalizePlate(e.target.value))}
          placeholder={placeholder}
          inputMode="text"
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoCapitalize="characters"
          aria-label="Nomor polisi kendaraan"
          className="tabular h-20 w-full rounded-2xl border-2 border-input bg-card px-12 text-center font-display text-3xl font-extrabold uppercase tracking-[0.2em] text-foreground shadow-sm transition-colors outline-none ring-primary placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 sm:h-24 sm:text-4xl"
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 inline-flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
            aria-label="Hapus nomor polisi"
          >
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Ketik nomor polisi dengan keyboard — huruf otomatis kapital
      </p>
    </div>
  );
}

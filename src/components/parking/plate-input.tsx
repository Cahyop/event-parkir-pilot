import { useEffect, useRef, useState } from "react";
import { Delete, Keyboard } from "lucide-react";

import { normalizePlate } from "@/lib/parking";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const LETTER_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const DIGITS = "1234567890";

interface PlateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function PlateInput({ value, onChange, placeholder = "B 1234 ABC" }: PlateInputProps) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<"letters" | "digits">("letters");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMobile) inputRef.current?.focus();
  }, [isMobile]);

  const append = (s: string) => onChange(normalizePlate(value + s));
  const backspace = () => {
    const trimmed = value.trimEnd();
    onChange(trimmed.slice(0, Math.max(0, trimmed.length - 1)).trimEnd());
  };

  const keys = mode === "letters" ? LETTER_ROWS : [DIGITS];

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(normalizePlate(e.target.value))}
        readOnly={isMobile}
        placeholder={placeholder}
        inputMode={isMobile ? "none" : "text"}
        autoComplete="off"
        autoCapitalize="characters"
        aria-label="Nomor polisi kendaraan"
        className="tabular h-14 w-full rounded-xl border border-input bg-card text-center font-display text-2xl font-bold uppercase tracking-[0.2em] text-foreground outline-none ring-primary placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground focus:ring-2"
      />
      {isMobile && (
        <div className="rounded-xl border border-border bg-card p-2 select-none">
          <div className="space-y-1.5">
            {keys.map((row, rowIdx) => (
              <div key={row} className="flex justify-center gap-1">
                {rowIdx === 2 && mode === "letters" && (
                  <button
                    type="button"
                    onClick={() => setMode(mode === "letters" ? "digits" : "letters")}
                    className="h-11 min-w-11 rounded-lg bg-secondary px-1.5 text-xs font-bold text-secondary-foreground active:bg-accent"
                    aria-label={mode === "letters" ? "Tampilkan angka" : "Tampilkan huruf"}
                  >
                    123
                  </button>
                )}
                {row.split("").map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => append(k)}
                    className="tabular h-11 min-w-9 flex-1 rounded-lg bg-secondary font-display text-base font-bold text-secondary-foreground active:bg-accent"
                  >
                    {k}
                  </button>
                ))}
                {rowIdx === 2 && (
                  <button
                    type="button"
                    onClick={backspace}
                    className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg bg-secondary px-2 text-secondary-foreground active:bg-accent"
                    aria-label="Hapus karakter"
                  >
                    <Delete className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            ))}
            {mode === "letters" && (
              <div className="flex justify-center gap-1">
                <button
                  type="button"
                  onClick={() => append(" ")}
                  className="h-11 flex-1 rounded-lg bg-secondary text-sm font-bold text-secondary-foreground active:bg-accent"
                >
                  SPASI
                </button>
              </div>
            )}
          </div>
          <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Keyboard className="size-3" aria-hidden />
            Huruf otomatis menjadi huruf besar
          </p>
        </div>
      )}
      {!isMobile && (
        <p className={cn("text-center text-xs text-muted-foreground")}>
          Ketik langsung — huruf otomatis menjadi huruf besar
        </p>
      )}
    </div>
  );
}

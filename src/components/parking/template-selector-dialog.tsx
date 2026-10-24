import { Check, FileText, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  TICKET_TEMPLATES,
  getTicketTemplate,
  setTicketTemplate,
  type TicketTemplate,
} from "@/lib/ticket-settings";
import { cn } from "@/lib/utils";

interface TemplateSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTemplate: TicketTemplate;
  onSelect: (template: TicketTemplate) => void;
}

export function TemplateSelectorDialog({
  open,
  onOpenChange,
  selectedTemplate,
  onSelect,
}: TemplateSelectorDialogProps) {
  const handleSelect = (tmpl: TicketTemplate) => {
    setTicketTemplate(tmpl);
    onSelect(tmpl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <FileText className="size-5 text-primary" />
            Format Struk Karcis
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pilih tata letak struk cetak thermal Bluetooth yang paling hemat kertas dan efisien untuk operasional Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 pt-2">
          {TICKET_TEMPLATES.map((t) => {
            const isSelected = selectedTemplate === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t.id)}
                className={cn(
                  "flex w-full items-start justify-between rounded-xl border-2 p-3.5 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-muted-foreground/30 hover:bg-accent/40",
                )}
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-foreground">
                      {t.name}
                    </span>
                    {t.id === "compact" && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Rekomendasi
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-bold",
                      t.id === "standard"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/15 text-primary",
                    )}
                  >
                    {t.savings}
                  </span>
                  {isSelected && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

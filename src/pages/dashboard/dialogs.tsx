import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatSessionWhen, formatShortDate } from "@/lib/rm-utils";
import type { ClientDoc } from "@/convex/sessions";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export type ClientFormValues = {
  name: string;
  phone: string;
  focusAreas: string;
  preferredOil: string;
  pressure: string;
  recurrenceDays: number;
  notes: string;
};

const EMPTY_CLIENT: ClientFormValues = {
  name: "",
  phone: "",
  focusAreas: "",
  preferredOil: "",
  pressure: "Moderada",
  recurrenceDays: 21,
  notes: "",
};

export function ClientDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ClientDoc | null;
}) {
  const [values, setValues] = useState<ClientFormValues>(EMPTY_CLIENT);
  const [saving, setSaving] = useState(false);
  const create = useMutation(api.clients.createClient);
  const update = useMutation(api.clients.updateClient);

  useEffect(() => {
    if (open) {
      setValues(
        initial
          ? {
              name: initial.name,
              phone: initial.phone ?? "",
              focusAreas: initial.focusAreas ?? "",
              preferredOil: initial.preferredOil ?? "",
              pressure: initial.pressure ?? "Moderada",
              recurrenceDays: initial.recurrenceDays,
              notes: initial.notes ?? "",
            }
          : EMPTY_CLIENT,
      );
    }
  }, [open, initial]);

  const set = (k: keyof ClientFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        await update({ id: initial._id as Id<"clients">, ...values });
        toast.success("Cliente atualizado.");
      } else {
        await create(values);
        toast.success("Cliente cadastrado com sucesso.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? "Atualize os dados e preferências deste cliente."
              : "Preencha a ficha rápida. Você pode ajustar depois."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name">Nome *</Label>
            <Input
              id="client-name"
              value={values.name}
              onChange={set("name")}
              placeholder="Ex.: Camila Lima"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-phone">WhatsApp (com DDD)</Label>
            <Input
              id="client-phone"
              value={values.phone}
              onChange={set("phone")}
              placeholder="Ex.: (11) 98888-7777"
              inputMode="tel"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pressão preferida</Label>
              <Select
                value={values.pressure}
                onValueChange={(v) => setValues((p) => ({ ...p, pressure: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Leve">Leve</SelectItem>
                  <SelectItem value="Moderada">Moderada</SelectItem>
                  <SelectItem value="Firme">Firme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-oil">Óleo / aroma favorito</Label>
              <Input
                id="client-oil"
                value={values.preferredOil}
                onChange={set("preferredOil")}
                placeholder="Ex.: Lavanda"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-focus">Foco corporal / queixas</Label>
            <Input
              id="client-focus"
              value={values.focusAreas}
              onChange={set("focusAreas")}
              placeholder="Ex.: Tensão no trapézio, cervicobraquialgia leve"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-recurrence">
              Sugestão de retorno a cada (dias)
            </Label>
            <Input
              id="client-recurrence"
              type="number"
              min={1}
              max={365}
              value={values.recurrenceDays}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  recurrenceDays: Math.max(1, Number(e.target.value) || 21),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-notes">Observações</Label>
            <Textarea
              id="client-notes"
              value={values.notes}
              onChange={set("notes")}
              placeholder="Preferências, restrições, contexto de saúde…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
                </>
              ) : initial ? (
                "Salvar alterações"
              ) : (
                "Cadastrar cliente"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type SessionFormValues = {
  clientId: string;
  technique: string;
  performedAt: string; // datetime-local
  durationMinutes: number;
  oilUsed: string;
  sessionNotes: string;
};

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function SessionDialog({
  open,
  onOpenChange,
  clients,
  presetClientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientDoc[];
  presetClientId?: Id<"clients"> | null;
}) {
  const [values, setValues] = useState<SessionFormValues>(() => ({
    clientId: "",
    technique: "",
    performedAt: toLocalInput(new Date()),
    durationMinutes: 50,
    oilUsed: "",
    sessionNotes: "",
  }));
  const [saving, setSaving] = useState(false);
  const createSession = useMutation(api.sessions.createSession);

  useEffect(() => {
    if (open) {
      setValues({
        clientId: presetClientId ?? clients[0]?._id ?? "",
        technique: "",
        performedAt: toLocalInput(new Date()),
        durationMinutes: 50,
        oilUsed: "",
        sessionNotes: "",
      });
    }
  }, [open, presetClientId, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.clientId || !values.technique.trim()) {
      toast.error("Selecione o cliente e informe a técnica utilizada.");
      return;
    }
    setSaving(true);
    try {
      await createSession({
        clientId: values.clientId as Id<"clients">,
        technique: values.technique.trim(),
        performedAt: new Date(values.performedAt).getTime(),
        durationMinutes: Math.max(1, values.durationMinutes),
        oilUsed: values.oilUsed || undefined,
        sessionNotes: values.sessionNotes || undefined,
      });
      toast.success("Atendimento registrado. Retorno sugerido atualizado.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar atendimento</DialogTitle>
          <DialogDescription>
            Anote a sessão em segundos — o retorno sugerido é atualizado
            automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              value={values.clientId}
              onValueChange={(v) => setValues((p) => ({ ...p, clientId: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-technique">Técnica / massagem *</Label>
            <Input
              id="session-technique"
              value={values.technique}
              onChange={(e) =>
                setValues((p) => ({ ...p, technique: e.target.value }))
              }
              placeholder="Ex.: Massagem Relaxante - Lombar"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session-when">Data e hora</Label>
              <Input
                id="session-when"
                type="datetime-local"
                value={values.performedAt}
                onChange={(e) =>
                  setValues((p) => ({ ...p, performedAt: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-duration">Duração (min)</Label>
              <Input
                id="session-duration"
                type="number"
                min={5}
                max={300}
                value={values.durationMinutes}
                onChange={(e) =>
                  setValues((p) => ({
                    ...p,
                    durationMinutes: Number(e.target.value) || 50,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-oil">Óleo utilizado</Label>
            <Input
              id="session-oil"
              value={values.oilUsed}
              onChange={(e) =>
                setValues((p) => ({ ...p, oilUsed: e.target.value }))
              }
              placeholder="Ex.: Óleo de lavanda"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-notes">Como foi a sessão?</Label>
            <Textarea
              id="session-notes"
              value={values.sessionNotes}
              onChange={(e) =>
                setValues((p) => ({ ...p, sessionNotes: e.target.value }))
              }
              placeholder="Pontos de tensão aliviados, reação do cliente, recomendações…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
                </>
              ) : (
                "Registrar atendimento"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClientDetailDialog({
  client,
  sessions,
  onClose,
  onEdit,
  onNewSession,
}: {
  client: ClientDoc | null;
  sessions: import("@/convex/_generated/dataModel").Doc<"sessions">[];
  onClose: () => void;
  onEdit: (c: ClientDoc) => void;
  onNewSession: (clientId: Id<"clients">) => void;
}) {
  const removeSession = useMutation(api.sessions.deleteSession);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (!client) return null;

  const clientSessions = sessions
    .filter((s) => s.clientId === client._id)
    .sort((a, b) => b.performedAt - a.performedAt);

  const handleDeleteSession = async (id: string) => {
    setDeleting(id);
    try {
      await removeSession({ id: id as Id<"sessions"> });
      toast.success("Atendimento removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={!!client} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed font-bold text-on-primary-fixed">
                {client.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-left">{client.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Retorno sugerido: {formatShortDate(client.nextReturnDueAt)}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-secondary">WhatsApp</p>
              <p className="text-foreground">{client.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary">Pressão</p>
              <p className="text-foreground">{client.pressure || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary">Óleo favorito</p>
              <p className="text-foreground">{client.preferredOil || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary">
                Cadência de retorno
              </p>
              <p className="text-foreground">
                a cada {client.recurrenceDays} dias
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold text-secondary">
                Foco corporal / queixas
              </p>
              <p className="text-foreground">{client.focusAreas || "—"}</p>
            </div>
            {client.notes && (
              <div className="col-span-2">
                <p className="text-xs font-semibold text-secondary">
                  Observações
                </p>
                <p className="text-foreground">{client.notes}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onNewSession(client._id as Id<"clients">)}>
              Registrar atendimento
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit(client)}>
              Editar ficha
            </Button>
          </div>

          <div>
            <h4 className="mb-2 font-semibold text-primary">
              Histórico de atendimentos ({clientSessions.length})
            </h4>
            {clientSessions.length === 0 ? (
              <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                Nenhum atendimento registrado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {clientSessions.map((s) => (
                  <div
                    key={s._id}
                    className="rounded-xl bg-muted p-4"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-primary">
                        {formatSessionWhen(s.performedAt)} • {s.technique}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-secondary">
                          {s.durationMinutes} min
                        </span>
                        <button
                          onClick={() => handleDeleteSession(s._id)}
                          disabled={deleting === s._id}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remover atendimento"
                        >
                          {deleting === s._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {s.oilUsed && (
                      <p className="text-xs text-secondary">
                        Óleo: {s.oilUsed}
                      </p>
                    )}
                    {s.sessionNotes && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {s.sessionNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

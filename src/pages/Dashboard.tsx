import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClientDialog,
  ClientDetailDialog,
  SessionDialog,
} from "@/pages/dashboard/dialogs";
import { api } from "@/convex/_generated/api";
import type { ClientDoc } from "@/convex/sessions";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarPlus,
  Loader2,
  LogOut,
  MessageCircle,
  Pencil,
  Search,
  Trash2,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  copyMessage,
  formatDaysAgo,
  formatDueLabel,
  formatSessionWhen,
  formatShortDate,
  greeting,
  initials,
  whatsappLink,
} from "@/lib/rm-utils";

function reminderMessage(
  therapistName: string,
  clientName: string,
  daysSinceLast: number | null,
) {
  const first = clientName.split(" ")[0];
  const since =
    daysSinceLast === null
      ? ""
      : ` Já faz ${daysSinceLast} ${daysSinceLast === 1 ? "dia" : "dias"} desde a última sessão.`;
  return `Olá, ${first}! Aqui é ${therapistName}. 💚 Como você está se sentindo depois da massagem?${since} Quando quiser, posso agendar sua próxima sessão de cuidado.`;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const clients = useQuery(api.clients.listClients);
  const sessions = useQuery(api.sessions.listSessions);
  const dashboard = useQuery(api.sessions.getDashboard);
  const deleteClient = useMutation(api.clients.deleteClient);

  const [tab, setTab] = useState("visao-geral");
  const [search, setSearch] = useState("");
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientDoc | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [presetClientId, setPresetClientId] = useState<Id<"clients"> | null>(
    null,
  );
  const [detailClient, setDetailClient] = useState<ClientDoc | null>(null);

  const therapistName =
    user?.name?.split(" ")[0] ?? "terapeuta";

  const activeClients = useMemo(() => {
    const list = (clients ?? []).filter((c) => !c.archived);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.focusAreas ?? "").toLowerCase().includes(q),
    );
  }, [clients, search]);

  const loading = clients === undefined || sessions === undefined;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const openNewClient = () => {
    setEditingClient(null);
    setClientDialogOpen(true);
  };

  const openEditClient = (c: ClientDoc) => {
    setDetailClient(null);
    setEditingClient(c);
    setClientDialogOpen(true);
  };

  const openNewSession = (clientId?: Id<"clients">) => {
    setPresetClientId(clientId ?? null);
    setSessionDialogOpen(true);
  };

  const handleRemind = (c: ClientDoc, daysSinceLast: number | null) => {
    const msg = reminderMessage(therapistName, c.name, daysSinceLast);
    const link = whatsappLink(c.phone, msg);
    if (link) {
      window.open(link, "_blank", "noopener");
    } else {
      void copyMessage(msg);
    }
  };

  const handleDeleteClient = async (c: ClientDoc) => {
    if (
      !window.confirm(
        `Excluir ${c.name}? O histórico de atendimentos também será removido.`,
      )
    ) {
      return;
    }
    try {
      await deleteClient({ id: c._id as Id<"clients"> });
      toast.success("Cliente excluído.");
      if (detailClient?._id === c._id) setDetailClient(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  };

  const stats = dashboard?.stats;
  const weekMax = Math.max(1, ...(dashboard?.weekCounts.map((w) => w.count) ?? [1]));

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8" />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight text-primary">
                Retorno Massagem
              </p>
              <p className="text-xs text-muted-foreground">Painel do profissional</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full bg-secondary-container/60 py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials(user?.name ?? "RM")}
              </span>
              <span className="text-sm font-semibold text-primary">
                {user?.name ?? "Profissional"}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
        {/* Greeting */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              {greeting()}, {therapistName}!
            </h1>
            <p className="text-muted-foreground">
              {dashboard && dashboard.pendingReturns.length > 0
                ? `Você tem ${dashboard.pendingReturns.length} ${
                    dashboard.pendingReturns.length === 1
                      ? "cliente aguardando"
                      : "clientes aguardando"
                  } um retorno carinhoso.`
                : "Sua carteira de clientes está em dia. 💚"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={openNewClient}>
              <UserRoundPlus className="size-4" />
              Novo cliente
            </Button>
            <Button
              variant="outline"
              onClick={() => openNewSession()}
              disabled={!activeClients.length}
            >
              <CalendarPlus className="size-4" />
              Registrar atendimento
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: Users,
              label: "Clientes ativos",
              value: stats ? String(stats.activeClients) : "—",
            },
            {
              icon: CalendarPlus,
              label: "Atendimentos no mês",
              value: stats ? String(stats.sessionsThisMonth) : "—",
            },
            {
              icon: MessageCircle,
              label: "Taxa de retorno",
              value: stats ? `${stats.returnRate}%` : "—",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-5"
            >
              <div>
                <p className="text-xs font-semibold text-secondary">{s.label}</p>
                <p className="text-3xl font-bold tracking-tight text-primary">
                  {s.value}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-container text-primary">
                <s.icon className="size-5" />
              </div>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="gap-6">
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-card p-1 shadow-sm">
            <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
            <TabsTrigger value="retornos">
              Retornos
              {dashboard && dashboard.pendingReturns.length > 0 && (
                <Badge className="ml-2 bg-tertiary-fixed text-on-tertiary-fixed hover:bg-tertiary-fixed">
                  {dashboard.pendingReturns.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="clientes">
              Clientes ({activeClients.length})
            </TabsTrigger>
            <TabsTrigger value="atendimentos">
              Atendimentos ({sessions?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* ── Visão geral ─────────────────────────────────────── */}
          <TabsContent value="visao-geral" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Week rhythm */}
              <div className="rounded-2xl border border-border/60 bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-primary">Ritmo da semana</h3>
                  <span className="text-xs text-muted-foreground">
                    seg–sex • sessões por dia
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {(dashboard?.weekCounts ?? []).map((d, i) => {
                    const isToday =
                      new Date().getDay() === i + 1 &&
                      new Date().getDay() >= 1 &&
                      new Date().getDay() <= 5;
                    return (
                      <div
                        key={d.label}
                        className={`rounded-xl p-3 ${
                          isToday ? "bg-secondary-container" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`block text-[11px] font-semibold ${
                            isToday ? "font-bold text-primary" : "text-secondary"
                          }`}
                        >
                          {d.label}
                        </span>
                        <span className="text-xl font-bold text-primary">
                          {d.count}
                        </span>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/60">
                          <div
                            className="h-full rounded-full bg-primary/70 transition-all"
                            style={{
                              width: `${(d.count / weekMax) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming */}
              <div className="rounded-2xl border border-border/60 bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-primary">
                    Próximos atendimentos
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openNewSession()}
                    disabled={!activeClients.length}
                  >
                    <CalendarPlus className="size-4" />
                    Registrar
                  </Button>
                </div>
                {loading ? (
                  <div className="flex h-24 items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !dashboard || dashboard.upcoming.length === 0 ? (
                  <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                    Nada agendado ainda. Ao registrar um atendimento futuro, ele
                    aparece aqui.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.upcoming.map((s) => {
                      const client = clients?.find((c) => c._id === s.clientId);
                      return (
                        <div
                          key={s._id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed text-xs font-bold text-on-primary-fixed">
                              {client ? initials(client.name) : "??"}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {client?.name ?? "Cliente"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatSessionWhen(s.performedAt)} •{" "}
                                {s.technique}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-secondary">
                            {s.durationMinutes} min
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pending returns preview */}
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-primary">
                  Retornos que merecem um carinho
                </h3>
                {dashboard && dashboard.pendingReturns.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setTab("retornos")}>
                    Ver todos
                  </Button>
                )}
              </div>
              {!dashboard || dashboard.pendingReturns.length === 0 ? (
                <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  Nenhum retorno pendente — seus clientes estão em dia. 🌿
                </p>
              ) : (
                <div className="space-y-2">
                  {dashboard.pendingReturns.slice(0, 4).map((r) => (
                    <ReturnRow
                      key={r.client._id}
                      row={r}
                      onRemind={handleRemind}
                      onOpen={(c) => setDetailClient(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Retornos ────────────────────────────────────────── */}
          <TabsContent value="retornos" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clientes cujo intervalo sugerido de retorno venceu ou vence nos
              próximos 7 dias. Envie uma mensagem pelo WhatsApp com um toque —
              sem insistência.
            </p>
            {!dashboard ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : dashboard.pendingReturns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <p className="text-2xl">🌿</p>
                <p className="mt-2 font-semibold text-primary">
                  Nenhum retorno pendente
                </p>
                <p className="text-sm text-muted-foreground">
                  Quando o intervalo sugerido de um cliente chegar, ele aparece
                  aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dashboard.pendingReturns.map((r) => (
                  <ReturnRow
                    key={r.client._id}
                    row={r}
                    onRemind={handleRemind}
                    onOpen={(c) => setDetailClient(c)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Clientes ────────────────────────────────────────── */}
          <TabsContent value="clientes" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, telefone ou queixa…"
                  className="pl-9"
                />
              </div>
              <Button onClick={openNewClient}>
                <UserRoundPlus className="size-4" />
                Novo cliente
              </Button>
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : activeClients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <p className="text-2xl">🤲</p>
                <p className="mt-2 font-semibold text-primary">
                  {search
                    ? "Nenhum cliente encontrado"
                    : "Sua carteira começa aqui"}
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  {search
                    ? "Tente buscar por outro nome ou telefone."
                    : "Cadastre seu primeiro cliente em menos de um minuto."}
                </p>
                {!search && (
                  <Button onClick={openNewClient}>
                    <UserRoundPlus className="size-4" />
                    Cadastrar cliente
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeClients.map((c) => {
                  const clientSessions =
                    sessions?.filter((s) => s.clientId === c._id) ?? [];
                  const nSessions = clientSessions.length;
                  const lastSession = clientSessions
                    .slice()
                    .sort((a, b) => b.performedAt - a.performedAt)[0];
                  const daysSinceLast = lastSession
                    ? Math.floor(
                        (Date.now() - lastSession.performedAt) /
                          (24 * 60 * 60 * 1000),
                      )
                    : null;
                  const due = formatDueLabel(c.nextReturnDueAt);
                  const isOverdue = due.startsWith("atrasado") || due === "vence hoje";
                  return (
                    <div
                      key={c._id}
                      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md"
                    >
                      <button
                        className="flex items-center gap-3 text-left"
                        onClick={() => setDetailClient(c)}
                        aria-label={`Ver ficha de ${c.name}`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-bold text-on-primary-fixed">
                          {initials(c.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-foreground">
                            {c.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.phone || "sem telefone"} •{" "}
                            {nSessions}{" "}
                            {nSessions === 1 ? "sessão" : "sessões"}
                          </span>
                        </span>
                      </button>

                      {c.focusAreas && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {c.focusAreas}
                        </p>
                      )}

                      <div className="mt-auto flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            isOverdue
                              ? "border-tertiary-fixed bg-tertiary-fixed/50 text-on-tertiary-fixed"
                              : "border-secondary-container bg-secondary-container/50 text-on-secondary-container"
                          }
                        >
                          retorno {due}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/60 pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          onClick={() => handleRemind(c, daysSinceLast)}
                        >
                          <MessageCircle className="size-4 text-primary" />
                          Lembrar
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => openEditClient(c)}
                            aria-label="Editar cliente"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteClient(c)}
                            aria-label="Excluir cliente"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Atendimentos ────────────────────────────────────── */}
          <TabsContent value="atendimentos" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => openNewSession()}
                disabled={!activeClients.length}
              >
                <CalendarPlus className="size-4" />
                Registrar atendimento
              </Button>
            </div>
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (sessions?.length ?? 0) === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <p className="text-2xl">💆</p>
                <p className="mt-2 font-semibold text-primary">
                  Nenhum atendimento registrado
                </p>
                <p className="text-sm text-muted-foreground">
                  Ao terminar uma sessão, registre em segundos e o retorno
                  sugerido é calculado sozinho.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => {
                  const client = clients?.find((c) => c._id === s.clientId);
                  return (
                    <div
                      key={s._id}
                      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-xs font-bold text-primary">
                          {client ? initials(client.name) : "??"}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {client?.name ?? "Cliente"} • {s.technique}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatSessionWhen(s.performedAt)} •{" "}
                            {s.durationMinutes} min
                            {s.oilUsed ? ` • ${s.oilUsed}` : ""}
                          </p>
                          {s.sessionNotes && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {s.sessionNotes}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="w-fit border-border text-muted-foreground"
                      >
                        {formatShortDate(s.performedAt)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      <ClientDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        initial={editingClient}
      />
      <SessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        clients={activeClients}
        presetClientId={presetClientId}
      />
      <ClientDetailDialog
        client={detailClient}
        sessions={sessions ?? []}
        onClose={() => setDetailClient(null)}
        onEdit={openEditClient}
        onNewSession={(id) => {
          setDetailClient(null);
          openNewSession(id);
        }}
      />
    </div>
  );
}

function ReturnRow({
  row,
  onRemind,
  onOpen,
}: {
  row: {
    client: ClientDoc;
    lastTechnique?: string;
    daysSinceLast: number | null;
  };
  onRemind: (c: ClientDoc, days: number | null) => void;
  onOpen: (c: ClientDoc) => void;
}) {
  const c = row.client;
  const due = formatDueLabel(c.nextReturnDueAt);
  const overdue = due.startsWith("atrasado") || due === "vence hoje";
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <button
        className="flex min-w-0 items-center gap-3 text-left"
        onClick={() => onOpen(c)}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${
            overdue
              ? "bg-tertiary-fixed text-on-tertiary-fixed"
              : "bg-secondary-container text-primary"
          }`}
        >
          {initials(c.name)}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-foreground">
              {c.name}
            </span>
            <Badge
              variant="outline"
              className={
                overdue
                  ? "border-tertiary/40 bg-tertiary/10 text-tertiary"
                  : "border-secondary-container bg-secondary-container/50 text-on-secondary-container"
              }
            >
              {due}
            </Badge>
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.daysSinceLast !== null
              ? `Última sessão ${formatDaysAgo(
                  Date.now() - row.daysSinceLast * 24 * 60 * 60 * 1000,
                )}`
              : "Primeiro retorno ainda não realizado"}
            {row.lastTechnique ? ` • ${row.lastTechnique}` : ""}
          </span>
        </span>
      </button>
      <div className="flex items-center gap-2 sm:self-auto">
        <Button size="sm" onClick={() => onRemind(c, row.daysSinceLast)}>
          <MessageCircle className="size-4" />
          Lembrar no WhatsApp
        </Button>
      </div>
    </div>
  );
}

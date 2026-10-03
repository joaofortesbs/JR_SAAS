import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, BookOpen, CalendarDays, Check, ChevronRight, CircleDashed, Clock3, FileText, LockKeyhole, RefreshCw, Timer, Workflow } from "lucide-react";
import { useLocation } from "wouter";

const destinations = [
  {
    path: "/provas",
    label: "Provas",
    description: "Organize seus objetivos e acompanhe datas importantes.",
    note: "Indisponível até a conexão do armazenamento",
    icon: CalendarDays,
    tone: "blue",
  },
  {
    path: "/flows",
    label: "Flows",
    description: "Transforme intenção em sessões de estudo.",
    note: "Sessões ainda não podem ser registradas",
    icon: Workflow,
    tone: "mint",
  },
  {
    path: "/redacoes",
    label: "Redações",
    description: "Escreva, revise e acompanhe seus textos.",
    note: "Textos ainda não podem ser salvos",
    icon: FileText,
    tone: "peach",
  },
  {
    path: "/rotina",
    label: "Rotina",
    description: "Encontre espaço para estudar no seu dia a dia.",
    note: "Sua rotina ainda não pode ser salva",
    icon: Clock3,
    tone: "yellow",
  },
];

export default function Panel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const firstName = user?.name?.trim().split(/\s+/)[0] || "estudante";
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="page-frame panel-page">
      <div className="page-heading panel-heading">
        <div>
          <p className="eyebrow">Visão geral · {today}</p>
          <h1 className="display-title">Painel</h1>
          <p className="body-copy mt-2 max-w-2xl">
            Olá, {firstName}. Este é o seu espaço para dar forma aos próximos passos.
          </p>
        </div>
        <span className="panel-state-chip">
          <CircleDashed size={15} />
          Preparação inicial
        </span>
      </div>

      <section className="panel-hero soft-card" aria-labelledby="panel-welcome-title">
        <div className="panel-hero-copy">
          <div className="pill pill-blue"><BookOpen size={14} /> Central JR</div>
          <h2 id="panel-welcome-title" className="hero-title mt-5">
            Um plano de estudos que começa pelo que importa.
          </h2>
          <p className="body-copy mt-3 max-w-xl">
            Seu painel já está pronto. Assim que o armazenamento estiver conectado,
            você poderá registrar provas, sessões, rotina e redações por aqui.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button className="soft-button-primary" onClick={() => setLocation("/provas")}>
              Explorar provas <ArrowUpRight size={16} />
            </Button>
            <Button
              variant="outline"
              className="soft-button-secondary"
              onClick={() => setLocation("/flows")}
            >
              Conhecer os Flows <ChevronRight size={15} />
            </Button>
          </div>
        </div>
        <div className="panel-hero-orbit panel-storage-mark" aria-hidden="true">
          <div className="orbit-ring orbit-ring-back" />
          <div className="orbit-ring orbit-ring-front" />
          <div className="panel-lock-mark"><LockKeyhole size={27} strokeWidth={1.6} /></div>
          <p>seu espaço<br />aguarda seus dados</p>
        </div>
      </section>

      <section className="panel-storage-note" aria-label="Estado do armazenamento">
        <div className="panel-storage-icon"><RefreshCw size={17} /></div>
        <div className="min-w-0">
          <p className="panel-storage-title">Armazenamento ainda não conectado</p>
          <p className="caption">
            Nenhuma informação de estudo foi carregada ou registrada. Seus indicadores
            aparecerão aqui quando o salvamento estiver disponível.
          </p>
        </div>
        <span className="panel-storage-badge">Aguardando conexão</span>
      </section>

      <section className="panel-section" aria-labelledby="panel-paths-title">
        <div className="panel-section-heading">
          <div>
            <p className="eyebrow">Seu espaço de estudo</p>
            <h2 id="panel-paths-title" className="card-title mt-1">Escolha por onde começar</h2>
          </div>
          <p className="caption panel-section-aside">Recursos em preparação</p>
        </div>
        <div className="panel-path-grid">
          {destinations.map(({ path, label, description, note, icon: Icon, tone }, index) => (
            <button
              key={path}
              type="button"
              className="panel-path-card soft-card"
              onClick={() => setLocation(path)}
              aria-label={`Abrir ${label}. ${note}.`}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="panel-path-top">
                <span className={`icon-bubble bubble-${tone}`}><Icon size={18} /></span>
                <span className="panel-path-arrow"><ArrowUpRight size={17} /></span>
              </div>
              <div className="panel-path-copy">
                <h3>{label}</h3>
                <p>{description}</p>
              </div>
              <div className="panel-path-foot">
                <span className="panel-unavailable-dot"><CircleDashed size={13} /></span>
                <span>{note}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-lower-grid" aria-label="Sobre seu painel">
        <div className="soft-card panel-promise">
          <div className="panel-promise-icon"><Check size={17} /></div>
          <div>
            <p className="eyebrow">Um começo honesto</p>
            <h2 className="card-title mt-1">Sem números inventados.</h2>
            <p className="body-copy mt-2">
              Seu tempo estudado, progresso e próximos prazos só serão exibidos depois
              que houver dados reais para mostrar.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="soft-card panel-next-link"
          onClick={() => setLocation("/conta")}
        >
          <span className="icon-bubble bubble-blue"><Timer size={18} /></span>
          <span className="panel-next-copy">
            <span className="eyebrow">Precisa de ajuda?</span>
            <strong>Veja sua conta</strong>
            <span className="caption">Gerencie seus dados de acesso.</span>
          </span>
          <ChevronRight size={17} />
        </button>
      </section>
    </div>
  );
}
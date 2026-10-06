import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { study as trpc } from "@/lib/study";
import { ArrowUpRight, BookOpen, CalendarDays, Check, ChevronRight, Clock3, FileText, RefreshCw, Timer, Workflow } from "lucide-react";
import { useLocation } from "wouter";

const destinations = [
  { path: "/provas", label: "Provas", description: "Objetivos, datas e conteúdos.", icon: CalendarDays, tone: "blue" },
  { path: "/flows", label: "Flows", description: "Sessões de foco e histórico.", icon: Workflow, tone: "mint" },
  { path: "/plano", label: "Plano", description: "Organize blocos de estudo.", icon: CalendarDays, tone: "yellow" },
  { path: "/redacoes", label: "Redações", description: "Textos, partes e versões.", icon: FileText, tone: "peach" },
  { path: "/rotina", label: "Rotina", description: "Janelas e compromissos.", icon: Clock3, tone: "yellow" },
];

export default function Panel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = trpc.dashboard.useQuery();
  const utils = trpc.useUtils();
  const firstName = user?.name?.trim().split(/\s+/)[0] || "estudante";
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const exams = data?.exams ?? [];
  const essays = data?.essays ?? [];
  const blocks = data?.blocks ?? [];
  const completed = blocks.filter(block => block.status === "completed");
  const plannedMinutes = (data?.windows ?? []).reduce((sum, window) => sum + window.maxMinutes, 0);
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
          <Timer size={15} />
          Supabase · conta privada
        </span>
      </div>

      <section className="panel-hero soft-card" aria-labelledby="panel-welcome-title">
        <div className="panel-hero-copy">
          <div className="pill pill-blue"><BookOpen size={14} /> Central JR</div>
          <h2 id="panel-welcome-title" className="hero-title mt-5">
            Um plano de estudos que começa pelo que importa.
          </h2>
          <p className="body-copy mt-3 max-w-xl">
            Provas, redações, planejamento e Flows acompanham sua conta. Rotina e biblioteca continuam temporárias.
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
          <div className="panel-lock-mark"><BookOpen size={27} strokeWidth={1.6} /></div>
          <p>um espaço<br />feito por você</p>
        </div>
      </section>

      <section className="panel-storage-note" aria-label="Atividade de estudo">
        <div className="panel-storage-icon"><Timer size={17} /></div>
        <div className="min-w-0">
          <p className="panel-storage-title">{error ? "Não foi possível carregar seus estudos" : isLoading ? "Consultando seus estudos…" : "Estudos da sua conta"}</p>
          <p className="caption">{error ? "Nenhum resultado temporário foi usado. Tente novamente para consultar o estado oficial." : isLoading ? "A atividade aparecerá quando a leitura autorizada for concluída." : `${exams.length} provas · ${essays.length} redações · ${completed.length} blocos concluídos · ${plannedMinutes} min nas janelas temporárias.`}</p>
        </div>
        {error ? <Button variant="outline" className="soft-button-secondary shrink-0" onClick={() => utils.study.snapshot.invalidate()}><RefreshCw size={15} /> Tentar novamente</Button> : <span className="panel-storage-badge">{isLoading ? "Aguardando" : "Supabase"}</span>}
      </section>

      <section className="panel-section" aria-labelledby="panel-paths-title">
        <div className="panel-section-heading">
          <div>
            <p className="eyebrow">Seu espaço de estudo</p>
            <h2 id="panel-paths-title" className="card-title mt-1">Escolha por onde começar</h2>
          </div>
          <p className="caption panel-section-aside">{blocks.length} sessões no plano</p>
        </div>
        <div className="panel-path-grid">
          {destinations.map(({ path, label, description, icon: Icon, tone }, index) => (
            <button
              key={path}
              type="button"
              className="panel-path-card soft-card"
              onClick={() => setLocation(path)}
              aria-label={`Abrir ${label}.`}
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
                <span className="panel-unavailable-dot"><ArrowUpRight size={13} /></span>
                <span>Abrir área</span>
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
            <h2 className="card-title mt-1">Cada módulo tem seu lugar.</h2>
            <p className="body-copy mt-2">Provas, redações, plano e Flows consultam o Supabase autenticado. Rotina e biblioteca permanecem temporárias e são enviadas ao gerar um plano, sem serem apresentadas como salvas.</p>
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
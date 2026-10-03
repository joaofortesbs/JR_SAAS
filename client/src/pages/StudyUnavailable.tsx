import { Link } from "wouter";
import { ArrowLeft, BookOpen, FileText, LockKeyhole, Target, Timer, CalendarDays } from "lucide-react";
import { PLATFORM_HOME } from "@/lib/navigation";

const modules = {
  exams: { title: "Provas", subtitle: "Prazos e objetivos", icon: Target, action: "Cadastrar prova", description: "O cadastro de provas e seus tópicos depende da conexão do armazenamento de estudos." },
  flows: { title: "Flows", subtitle: "Tempo em movimento", icon: Timer, action: "Iniciar Flow", description: "Sessões, cronômetros e planos de estudo ainda não podem ser registrados ou retomados." },
  essays: { title: "Redações", subtitle: "Escrita com direção", icon: FileText, action: "Criar redação", description: "O editor, o histórico de textos e os uploads serão liberados quando houver armazenamento conectado." },
  routine: { title: "Minha rotina", subtitle: "Organização dos estudos", icon: CalendarDays, action: "Registrar rotina", description: "Janelas de estudo e compromissos ainda não podem ser salvos na sua conta." },
  resources: { title: "Biblioteca", subtitle: "Seus recursos de estudo", icon: BookOpen, action: "Adicionar recurso", description: "Recursos e anexos ainda não podem ser armazenados ou associados aos seus estudos." },
};

export default function StudyUnavailable({ module }: { module: keyof typeof modules }) {
  const { title, subtitle, icon: Icon, action, description } = modules[module];
  return <div className="page-frame">
    <div className="page-heading"><div><p className="eyebrow">{subtitle}</p><h1 className="display-title">{title}</h1></div>
      <button className="soft-button-primary inline-flex items-center gap-2 px-5 py-3 opacity-60 cursor-not-allowed" disabled aria-describedby="study-unavailable-description"><LockKeyhole size={16} />{action}</button>
    </div>
    <section className="soft-card p-6 sm:p-10 mt-6" aria-labelledby="study-unavailable-title">
      <div className="icon-bubble bubble-peach mb-5"><Icon size={22} /></div>
      <p className="eyebrow">Armazenamento não conectado</p>
      <h2 className="card-title mt-2" id="study-unavailable-title">Este módulo ainda não está disponível.</h2>
      <p className="body-copy mt-3 max-w-2xl" id="study-unavailable-description">{description} Nenhum dado antigo foi carregado; este aviso não significa que seus estudos anteriores foram apagados.</p>
      <p className="caption mt-4">Sua conta está ativa. As ações de persistência permanecem desativadas para evitar perda de informações.</p>
      <Link href={PLATFORM_HOME} className="text-link inline-flex items-center gap-2 mt-6"><ArrowLeft size={16} />Voltar ao Painel</Link>
    </section>
  </div>;
}
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookMarked, CalendarDays, FileText, LayoutDashboard, LogOut, Menu, Moon, Sparkles, Sun, Target, TimerReset, UserRound, Workflow, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { authMessage } from "@shared/auth";

const primaryItems = [
  { path: "/painel", legacy: ["/", "/hoje", "/evolucao"], label: "Painel", description: "Visão geral", icon: LayoutDashboard },
  { path: "/provas", legacy: [], label: "Provas", description: "Prazos e objetivos", icon: Target },
  { path: "/redacoes", legacy: [], label: "Redações", description: "Escrita com direção", icon: FileText },
  { path: "/flows", legacy: [], label: "Flows", description: "Tempo em movimento", icon: Workflow },
  { path: "/plano", legacy: [], label: "Plano", description: "Organizar a semana", icon: CalendarDays },
  { path: "/biblioteca", legacy: [], label: "Biblioteca", description: "Materiais de estudo", icon: BookMarked },
];

function ProfileCard({ name, initials }: { name: string; initials: string }) {
  return (
    <div className="sidebar-profile-card" aria-label={`Perfil de ${name}`}>
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="sidebar-profile-label">SEU PERFIL</p>
        <p className="sidebar-profile-name truncate">{name}</p>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  const sidebar = useRef<HTMLElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const change = () => setIsMobile(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    sidebar.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const items = sidebar.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [mobileOpen]);

  const go = (path: string) => {
    setLocation(path);
    setMobileOpen(false);
    setProfileOpen(false);
  };
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location]);
  const signOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError("");
    try { await logout(); setLocation("/login"); }
    catch (error) { setLogoutError(authMessage(error)); }
    finally { setLoggingOut(false); }
  };

  if (loading) return <div className="min-h-screen grid place-items-center bg-[var(--edu-bg)]"><div className="soft-loader" aria-label="Carregando Central JR" /></div>;
  if (!user) return <div className="min-h-screen bg-[var(--edu-bg)] px-6 py-10 grid place-items-center"><div className="auth-card soft-card max-w-lg w-full p-8 sm:p-12 text-center"><div className="brand-mark mx-auto mb-6"><Sparkles size={22} /></div><p className="eyebrow">CENTRAL JR</p><h1 className="display-title mt-3">Aprenda no seu ritmo.</h1><p className="body-copy mt-4">Uma central acolhedora para organizar provas, rotina, sessões e redações — com clareza sobre o próximo passo.</p><Button onClick={() => startLogin()} className="mt-8 soft-button-primary w-full">Entrar na Central JR <Sparkles size={16} /></Button><p className="caption mt-4">Ambiente privado e personalizado.</p></div></div>;

  const initials = (user.name ?? "Estudante").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const current = primaryItems.find(item => location.startsWith(item.path) || item.legacy.some(path => path === "/" ? location === "/" : location.startsWith(path)));
  const currentLabel = current?.label ?? (location.startsWith("/conta") ? "Minha conta" : location.startsWith("/redacoes") ? "Redações" : location.startsWith("/biblioteca") ? "Biblioteca" : location.startsWith("/rotina") ? "Minha rotina" : "Central JR");

  return <div className="min-h-screen bg-[var(--edu-bg)] text-[var(--edu-text-primary)]">
    <aside ref={sidebar} className={cn("app-sidebar", mobileOpen && "is-open")} aria-label="Navegação da Central JR" inert={isMobile && !mobileOpen} aria-hidden={isMobile && !mobileOpen ? true : undefined}>
      <div className="sidebar-top">
        <div className="brand-row"><div className="brand-mark"><Sparkles size={18} /></div><span className="brand-name">Central JR</span><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18} /></button></div>
        <ProfileCard name={user.name ?? "Estudante"} initials={initials} />
      </div>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        <p className="nav-label">Navegação principal</p>
        <div className="primary-nav-list">{primaryItems.map(item => {
          const active = current?.path === item.path;
          return <button key={item.path} onClick={() => go(item.path)} className={cn("nav-item", active && "active")} aria-current={active ? "page" : undefined}>
            <span className="nav-item-icon"><item.icon size={19} strokeWidth={1.8} /></span><span className="nav-item-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
          </button>;
        })}</div>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-account-actions">
          <button className="sidebar-action" onClick={() => go("/rotina")} aria-current={location === "/rotina" ? "page" : undefined}><TimerReset size={17} /><span>Minha rotina</span></button>
          <button className="sidebar-action" onClick={() => go("/conta")} aria-current={location === "/conta" ? "page" : undefined}><UserRound size={17} /><span>Minha conta</span></button>
          <button className="sidebar-action" onClick={toggleTheme}><span className="sidebar-action-icon">{dark ? <Sun size={17} /> : <Moon size={17} />}</span><span>{dark ? "Tema claro" : "Tema escuro"}</span></button>
        </div>
        {logoutError && <p className="caption px-3" role="alert">{logoutError}</p>}
        <button className="logout-button" onClick={signOut} disabled={loggingOut}><LogOut size={16} /> {loggingOut ? "Saindo…" : "Sair da conta"}</button>
      </div>
    </aside>
    {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fechar navegação" />}
    <main className="app-main">
      <header className="topbar"><div className="flex items-center gap-3"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" aria-expanded={mobileOpen}><Menu size={20} /></button><div><p className="caption">CENTRAL JR / {currentLabel.toUpperCase()}</p><h2 className="section-title">{currentLabel}</h2></div></div><div className="topbar-actions"><div className="profile-menu-wrap"><button className="profile-trigger" onClick={() => setProfileOpen(value => !value)} aria-expanded={profileOpen} aria-label="Abrir menu do perfil"><Avatar className="h-9 w-9"><AvatarFallback>{initials}</AvatarFallback></Avatar></button>{profileOpen && <div className="profile-menu" role="menu"><p className="caption px-3 pb-2">Conta pessoal</p><button role="menuitem" onClick={() => go("/rotina")}><TimerReset size={15} /> Minha rotina</button><button role="menuitem" onClick={() => go("/conta")}><UserRound size={15} /> Minha conta</button></div>}</div></div></header>
      <div className="mx-4 mt-3 rounded-xl border border-[var(--edu-blue-strong)]/20 bg-[var(--edu-blue-soft)] px-4 py-3 text-sm leading-relaxed sm:mx-8" role="status">
        <strong>Modo temporário:</strong> seus estudos existem somente nesta sessão em memória. Recarregar, sair ou trocar de conta descarta provas, textos, rotina e sessões. Nada é gravado em armazenamento nem enviado.
      </div>
      {children}
    </main>
  </div>;
}

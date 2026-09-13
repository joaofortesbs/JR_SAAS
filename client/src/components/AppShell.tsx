import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, CalendarDays, ClipboardList, FileText, Home, Library, LogOut, Menu, Moon, Settings2, Sparkles, Sun, Target, TimerReset, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const items = [
  { path: "/hoje", label: "Hoje", icon: Home },
  { path: "/plano", label: "Plano", icon: CalendarDays },
  { path: "/provas", label: "Provas", icon: Target },
  { path: "/redacoes", label: "Redações", icon: FileText },
  { path: "/biblioteca", label: "Biblioteca", icon: Library },
  { path: "/evolucao", label: "Evolução", icon: TrendingUp },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  if (loading) return <div className="min-h-screen grid place-items-center bg-[var(--edu-bg)]"><div className="soft-loader" aria-label="Carregando" /></div>;
  if (!user) return (
    <div className="min-h-screen bg-[var(--edu-bg)] px-6 py-10 grid place-items-center">
      <div className="auth-card soft-card max-w-lg w-full p-8 sm:p-12 text-center">
        <div className="brand-mark mx-auto mb-6"><Sparkles size={22} /></div>
        <p className="eyebrow">PONTO ESTUDOS</p>
        <h1 className="display-title mt-3">Seu próximo passo, com calma.</h1>
        <p className="body-copy mt-4">Um estúdio pessoal para organizar provas, rotina, sessões e redações sem transformar seus estudos em mais uma fonte de pressão.</p>
        <Button onClick={() => startLogin()} className="mt-8 soft-button-primary w-full">Entrar na plataforma <Sparkles size={16} /></Button>
        <p className="caption mt-4">Ambiente privado e personalizado.</p>
      </div>
    </div>
  );

  const initials = (user.name ?? "Estudante").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const current = items.find(item => location.startsWith(item.path));
  const currentLabel = current?.label ?? (location.startsWith("/rotina") ? "Minha rotina" : "Configurações");

  return <div className="min-h-screen bg-[var(--edu-bg)] text-[var(--edu-text-primary)]">
    <aside className={cn("app-sidebar", mobileOpen && "is-open")}>
      <div className="sidebar-top">
        <div className="brand-row"><div className="brand-mark"><Sparkles size={18} /></div><span className="brand-name">Ponto Estudos</span><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18} /></button></div>
        <div className="profile-mini"><Avatar className="h-10 w-10"><AvatarFallback>{initials}</AvatarFallback></Avatar><div className="min-w-0"><p className="font-semibold truncate">{user.name ?? "Estudante"}</p><p className="caption truncate">Estúdio de aprovação</p></div></div>
      </div>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        <p className="nav-label">Seu espaço</p>
        {items.map(item => <button key={item.path} onClick={() => { setLocation(item.path); setMobileOpen(false); }} className={cn("nav-item", location.startsWith(item.path) && "active")}><item.icon size={19} strokeWidth={1.8} /><span>{item.label}</span></button>)}
        <p className="nav-label mt-7">Configuração</p>
        <button onClick={() => { setLocation("/rotina"); setMobileOpen(false); }} className={cn("nav-item", location.startsWith("/rotina") && "active")}><TimerReset size={19} strokeWidth={1.8} /><span>Minha rotina</span></button>
        <button onClick={() => { setLocation("/configuracoes"); setMobileOpen(false); }} className={cn("nav-item", location.startsWith("/configuracoes") && "active")}><Settings2 size={19} strokeWidth={1.8} /><span>Configurações</span></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><BookOpen size={18} /><div><p className="font-semibold text-sm">Um passo de cada vez</p><p className="text-xs opacity-75 mt-1">Você não precisa vencer a semana hoje.</p></div></div>
        <button className="logout-button" onClick={() => logout()}><LogOut size={16} /> Sair</button>
      </div>
    </aside>
    {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fechar navegação" />}
    <main className="app-main">
      <header className="topbar"><div className="flex items-center gap-3"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><div><p className="caption">PONTO ESTUDOS / {currentLabel.toUpperCase()}</p><h2 className="section-title">{currentLabel}</h2></div></div><div className="topbar-actions"><button className="icon-button" onClick={toggleTheme} aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button><Avatar className="h-9 w-9 sm:hidden"><AvatarFallback>{initials}</AvatarFallback></Avatar></div></header>
      {children}
    </main>
  </div>;
}

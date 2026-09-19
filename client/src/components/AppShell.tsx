import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronDown, FileText, LayoutDashboard, Library, LogOut, Menu, Moon, Settings2, Sparkles, Sun, Target, TimerReset, Workflow, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const primaryItems = [
  { path: "/painel", legacy: ["/", "/hoje", "/evolucao"], label: "Painel", icon: LayoutDashboard },
  { path: "/provas", legacy: [], label: "Provas", icon: Target },
  { path: "/flows", legacy: ["/plano"], label: "Flows", icon: Workflow },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggleTheme = () => { const next = !dark; setDark(next); document.documentElement.classList.toggle("dark", next); };
  const go = (path: string) => { setLocation(path); setMobileOpen(false); };
  if (loading) return <div className="min-h-screen grid place-items-center bg-[var(--edu-bg)]"><div className="soft-loader" aria-label="Carregando" /></div>;
  if (!user) return <div className="min-h-screen bg-[var(--edu-bg)] px-6 py-10 grid place-items-center"><div className="auth-card soft-card max-w-lg w-full p-8 sm:p-12 text-center"><div className="brand-mark mx-auto mb-6"><Sparkles size={22} /></div><p className="eyebrow">PONTO ESTUDOS</p><h1 className="display-title mt-3">Seu próximo passo, com calma.</h1><p className="body-copy mt-4">Um estúdio pessoal para organizar provas, rotina, sessões e redações sem transformar seus estudos em mais uma fonte de pressão.</p><Button onClick={() => startLogin()} className="mt-8 soft-button-primary w-full">Entrar na plataforma <Sparkles size={16} /></Button><p className="caption mt-4">Ambiente privado e personalizado.</p></div></div>;
  const initials = (user.name ?? "Estudante").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const current = primaryItems.find(item => location.startsWith(item.path) || item.legacy.some(path => path === "/" ? location === "/" : location.startsWith(path)));
  const currentLabel = current?.label ?? (location.startsWith("/redacoes") ? "Redações" : location.startsWith("/biblioteca") ? "Biblioteca" : location.startsWith("/rotina") ? "Minha rotina" : "Preferências");
  const secondaryActive = location.startsWith("/redacoes") || location.startsWith("/biblioteca");
  return <div className="min-h-screen bg-[var(--edu-bg)] text-[var(--edu-text-primary)]"><aside className={cn("app-sidebar", mobileOpen && "is-open")}><div className="sidebar-top"><div className="brand-row"><div className="brand-mark"><Sparkles size={18} /></div><span className="brand-name">Ponto Estudos</span><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18} /></button></div><div className="profile-mini"><Avatar className="h-10 w-10"><AvatarFallback>{initials}</AvatarFallback></Avatar><div className="min-w-0"><p className="font-semibold truncate">{user.name ?? "Estudante"}</p><p className="caption truncate">Estúdio de aprovação</p></div></div></div><nav className="sidebar-nav" aria-label="Navegação principal"><p className="nav-label">Seu espaço</p>{primaryItems.map(item => <button key={item.path} onClick={() => go(item.path)} className={cn("nav-item", current?.path === item.path && "active")}><item.icon size={19} strokeWidth={1.8} /><span>{item.label}</span></button>)}<div className="nav-section-divider" /><button onClick={() => setMoreOpen(value => !value)} className={cn("nav-item nav-more", secondaryActive && "active")}><Sparkles size={18} strokeWidth={1.8} /><span>Mais ferramentas</span><ChevronDown className={cn("ml-auto transition-transform", moreOpen && "rotate-180")} size={15} /></button>{moreOpen && <div className="nav-subitems"><button onClick={() => go("/redacoes")} className={cn("nav-item nav-subitem", location.startsWith("/redacoes") && "active")}><FileText size={17} /><span>Redações</span></button><button onClick={() => go("/biblioteca")} className={cn("nav-item nav-subitem", location.startsWith("/biblioteca") && "active")}><Library size={17} /><span>Biblioteca</span></button></div>}</nav><div className="sidebar-bottom"><div className="help-card"><BookOpen size={18} /><div><p className="font-semibold text-sm">Um passo de cada vez</p><p className="text-xs opacity-75 mt-1">Você não precisa vencer a semana hoje.</p></div></div><button className="logout-button" onClick={() => logout()}><LogOut size={16} /> Sair</button></div></aside>{mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fechar navegação" />}<main className="app-main"><header className="topbar"><div className="flex items-center gap-3"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><div><p className="caption">PONTO ESTUDOS / {currentLabel.toUpperCase()}</p><h2 className="section-title">{currentLabel}</h2></div></div><div className="topbar-actions"><button className="icon-button" onClick={toggleTheme} aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button><div className="profile-menu-wrap"><button className="profile-trigger" onClick={() => setProfileOpen(value => !value)} aria-expanded={profileOpen} aria-label="Abrir menu do perfil"><Avatar className="h-9 w-9"><AvatarFallback>{initials}</AvatarFallback></Avatar></button>{profileOpen && <div className="profile-menu" role="menu"><p className="caption px-3 pb-2">Conta pessoal</p><button onClick={() => go("/rotina")}><TimerReset size={15} /> Minha rotina</button><button onClick={() => go("/configuracoes")}><Settings2 size={15} /> Preferências</button></div>}</div></div></header>{children}</main></div>;
}

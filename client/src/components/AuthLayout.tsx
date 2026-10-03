import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowUpRight, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

type AuthLayoutProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
};

export default function AuthLayout({ children, eyebrow, title, description, footer }: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Central JR">
        <div className="auth-story-top">
          <Link href="/" className="auth-brand" aria-label="Central JR, início">
            <span className="auth-brand-mark" aria-hidden="true">jr</span>
            <span>Central <strong>JR</strong></span>
          </Link>
          {toggleTheme && (
            <button className="auth-theme-toggle" type="button" onClick={toggleTheme}
              aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}>
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          )}
        </div>

        <div className="auth-story-body">
          <span className="auth-kicker">UM PASSO DE CADA VEZ</span>
          <h1>Seu próximo passo merece <em>clareza.</em></h1>
          <p>Um espaço para organizar os estudos, entender o que vem agora e seguir no seu ritmo.</p>
          <div className="auth-path-card" aria-label="Uma direção possível">
            <div className="auth-path-heading">
              <span className="auth-path-dot" />
              <span>Seu caminho, sem atalhos mágicos</span>
            </div>
            <div className="auth-path-line">
              <span className="auth-path-step is-done"><i>01</i><b>Entender</b></span>
              <span className="auth-path-step is-current"><i>02</i><b>Organizar</b></span>
              <span className="auth-path-step"><i>03</i><b>Avançar</b></span>
            </div>
            <p>Constância não é fazer tudo. É saber o que fazer a seguir.</p>
          </div>
        </div>

        <div className="auth-story-bottom">
          <span>Central JR</span>
          <span>Feito para estudar com intenção.</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-mobile-brand">
          <Link href="/" className="auth-brand">
            <span className="auth-brand-mark" aria-hidden="true">jr</span>
            <span>Central <strong>JR</strong></span>
          </Link>
          {toggleTheme && (
            <button className="auth-theme-toggle" type="button" onClick={toggleTheme}
              aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}>
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          )}
        </div>
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <span className="auth-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
        <div className="auth-panel-note">
          <span>Central JR</span>
          <Link href="/" className="auth-back-link">Voltar ao início <ArrowUpRight size={14} /></Link>
        </div>
      </section>
    </main>
  );
}
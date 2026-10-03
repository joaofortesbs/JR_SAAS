import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, BookOpen, CalendarDays, LogOut, Moon, Sun, UserRound, LockKeyhole, AlertCircle } from "lucide-react";
import { authMessage } from "@shared/auth";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { PLATFORM_HOME } from "@/lib/navigation";

type AccountPageProps = { unavailable?: boolean; embedded?: boolean };

export default function AccountPage({ unavailable = false, embedded = false }: AccountPageProps) {
  const { user, loading, error: authError, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const signOut = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      setLogoutError(authMessage(error));
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return <main className="account-page"><div className="account-loading"><span className="account-skeleton" /><span className="account-skeleton" /><span className="account-skeleton" /></div></main>;
  }

  if (!user) {
    return (
      <main className="account-page">
        <div className="account-state-card">
          <span className="account-state-icon"><UserRound size={22} /></span>
          <p className="auth-eyebrow">SUA CONTA</p>
          <h1>Entre para continuar.</h1>
          <p>{authError ? authMessage(authError) : "Sua sessão não está ativa neste navegador. Entre novamente para acessar seu espaço."}</p>
          <Link href="/login" className="auth-primary-link">Ir para entrar <ArrowRight size={17} /></Link>
        </div>
      </main>
    );
  }

  const displayName = user.name?.trim() || "Estudante";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const Container = embedded ? "div" : "main";

  return (
    <Container className={`account-page${embedded ? " account-page-embedded" : ""}`}>
      {!embedded && <header className="account-header">
        <Link href="/" className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">jr</span>
          <span>Central <strong>JR</strong></span>
        </Link>
        <div className="account-header-actions">
          {toggleTheme && <button className="auth-theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>}
          <button className="account-logout" type="button" onClick={signOut} disabled={loggingOut}>
            <LogOut size={16} /> {loggingOut ? "Saindo…" : "Sair"}
          </button>
        </div>
      </header>}

      <div className="account-content">
        <div className="account-intro">
          <span className="auth-eyebrow">MINHA CONTA</span>
          <h1>Bom ter você por aqui, <em>{displayName.split(" ")[0]}.</em></h1>
          <p>Esta é sua conta Central JR. Vamos deixar claro o que já está disponível e o que ainda não está.</p>
        </div>

        {logoutError && <div className="auth-alert is-error" role="alert"><AlertCircle size={17} />{logoutError}</div>}
        {unavailable && (
          <div className="account-unavailable" role="status">
            <span><AlertCircle size={19} /></span>
            <div><strong>Este módulo ainda não está disponível.</strong><p>Seu acesso está ativo, mas esta área de estudos ainda não pode ser carregada. Seus dados de conta continuam disponíveis abaixo.</p></div>
          </div>
        )}

        <section className="account-profile-card" aria-labelledby="account-profile-heading">
          <div className="account-avatar" aria-hidden="true">{initials || "JR"}</div>
          <div className="account-profile-main">
            <span className="auth-eyebrow">PERFIL</span>
            <h2 id="account-profile-heading">{displayName}</h2>
            <p>{user.email || "E-mail não informado"}</p>
          </div>
          <span className="account-status"><span /> Conta ativa</span>
          <div className="account-id">
            <span>ID da conta</span>
            <code>{user.id}</code>
          </div>
        </section>

        <section className="account-persistence" aria-labelledby="account-persistence-heading">
          <div className="account-section-heading">
            <div>
              <span className="auth-eyebrow">COM TRANSPARÊNCIA</span>
              <h2 id="account-persistence-heading">Seus estudos ainda não são salvos.</h2>
            </div>
            <span className="account-lock-mark"><LockKeyhole size={19} /></span>
          </div>
          <p>A autenticação da conta está funcionando, mas a persistência dos dados de estudo ainda não está disponível. Suas ações de estudo não serão guardadas entre sessões.</p>
          <div className="account-disabled-actions">
            <button type="button" disabled><BookOpen size={17} /> Salvar plano de estudos <span>Indisponível</span></button>
            <button type="button" disabled><CalendarDays size={17} /> Registrar rotina <span>Indisponível</span></button>
          </div>
          <small>Não insira informações de estudo esperando que sejam salvas.</small>
        </section>

        <nav className="account-navigation" aria-label="Navegação">
          <Link href={PLATFORM_HOME} className="account-nav-link"><span className="account-nav-icon"><BookOpen size={18} /></span><span><strong>Início</strong><small>Voltar ao Painel</small></span><ArrowRight size={17} /></Link>
          <Link href="/conta" className="account-nav-link"><span className="account-nav-icon"><UserRound size={18} /></span><span><strong>Minha conta</strong><small>Dados e acesso</small></span><ArrowRight size={17} /></Link>
        </nav>

        <footer className="account-footer">Central JR <span>Um próximo passo de cada vez.</span></footer>
      </div>
    </Container>
  );
}
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { authMessage, validateAccess } from "@shared/auth";
import { callbackUrl, getSupabase } from "@/lib/supabase";
import { useAuth } from "@/_core/hooks/useAuth";
import AuthLayout from "@/components/AuthLayout";
import { PLATFORM_HOME } from "@/lib/navigation";

type AuthMode = "login" | "register" | "forgot" | "reset" | "callback";
type Values = { name: string; email: string; password: string; confirmation: string };
type Props = { mode: AuthMode };

const blank: Values = { name: "", email: "", password: "", confirmation: "" };

export default function AuthPage({ mode }: Props) {
  const { user, loading: authLoading, error: providerError, recovery, callbackStatus, logout } = useAuth();
  const [, navigate] = useLocation();
  const [values, setValues] = useState<Values>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [needsRecoveryLink, setNeedsRecoveryLink] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);

  const loginUpdated = useMemo(() => new URLSearchParams(window.location.search).get("password") === "updated", []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (mode === "login" && user && !authLoading) navigate(recovery ? "/redefinir-senha" : PLATFORM_HOME);
  }, [mode, user, authLoading, recovery, navigate]);

  useEffect(() => {
    setValues(blank); setErrors({}); setMessage(""); setProblem("");
    setConfirmationPending(false); setNeedsRecoveryLink(false);
    setPasswordUpdated(false); setUnconfirmed(false);
  }, [mode]);

  const setField = (field: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const fieldError = (field: keyof Values) => errors[field] ? `auth-${field}-error` : undefined;
  const valid = () => {
    const next = validateAccess(values, mode);
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const fail = (error: unknown) => {
    setProblem(authMessage(error));
    if ((error as { code?: string })?.code === "email_not_confirmed") setUnconfirmed(true);
    setMessage("");
  };

  const resendConfirmation = async () => {
    if (busy || cooldown > 0 || !values.email.trim()) return;
    setBusy(true);
    setProblem("");
    try {
      const client = await getSupabase();
      const { error } = await client.auth.resend({
        type: "signup",
        email: values.email.trim(),
        options: { emailRedirectTo: callbackUrl() },
      });
      if (error) throw error;
      setMessage("Se houver uma confirmação pendente para este e-mail, enviaremos um novo link.");
      setCooldown(45);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const finishReset = async () => {
    setBusy(true);
    setProblem("");
    try {
      await logout();
      navigate("/login?password=updated");
    } catch {
      setProblem("Sua senha foi atualizada, mas não conseguimos encerrar esta sessão. Tente sair novamente.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || (mode === "forgot" && cooldown > 0)) return;
    setProblem("");
    setMessage("");
    if (mode === "callback") return;
    if (mode === "reset" && (!recovery || !user)) {
      setNeedsRecoveryLink(true);
      return;
    }
    if (!valid()) return;
    setBusy(true);
    try {
      const client = await getSupabase();
      if (mode === "login") {
        const { data, error } = await client.auth.signInWithPassword({
          email: values.email.trim(),
          password: values.password,
        });
        if (error) throw error;
        if (!data.session) {
          setProblem("Sua sessão não foi iniciada. Tente entrar novamente.");
          return;
        }
        navigate(PLATFORM_HOME);
      } else if (mode === "register") {
        const { data, error } = await client.auth.signUp({
          email: values.email.trim(),
          password: values.password,
          options: {
            data: { name: values.name.trim() },
            emailRedirectTo: callbackUrl(),
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate(PLATFORM_HOME);
        } else if (data.user) {
          setConfirmationPending(true);
          setMessage("Cadastro recebido. Confirme seu e-mail pelo link enviado para continuar.");
          setCooldown(45);
        } else {
          setConfirmationPending(true);
          setMessage("Se este endereço puder receber um cadastro, enviaremos as próximas instruções por e-mail.");
          setCooldown(45);
        }
      } else if (mode === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(values.email.trim(), { redirectTo: callbackUrl() });
        if (error) throw error;
        setMessage("Se houver uma conta com este e-mail, enviaremos um link para redefinir sua senha.");
        setCooldown(45);
      } else if (mode === "reset") {
        if (!recovery || !user) {
          setNeedsRecoveryLink(true);
          return;
        }
        const { error } = await client.auth.updateUser({ password: values.password });
        if (error) throw error;
        setPasswordUpdated(true);
        await finishReset();
      }
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const resendNote = confirmationPending && (
    <div className="auth-inline-action">
      <span>Não chegou? Verifique o spam ou peça outro link.</span>
      <button type="button" className="auth-text-button" onClick={resendConfirmation} disabled={busy || cooldown > 0}>
        {busy ? "Enviando…" : cooldown > 0 ? `Tentar novamente em ${cooldown}s` : "Reenviar confirmação"}
      </button>
    </div>
  );

  const inputField = (field: keyof Values, label: string, type: string, autoComplete: string, options?: { visible?: boolean; toggle?: () => void; visibleState?: boolean; hint?: string }) => {
    const id = `auth-${field}`;
    const errorId = fieldError(field);
    return (
      <div className="auth-field" key={field}>
        <label htmlFor={id}>{label}</label>
        <div className={`auth-input-shell${errorId ? " has-error" : ""}`}>
          {field === "email" ? <Mail className="auth-input-icon" size={17} aria-hidden="true" /> : field === "password" || field === "confirmation" ? <KeyRound className="auth-input-icon" size={17} aria-hidden="true" /> : null}
          <input
            id={id}
            name={field}
            type={options?.visible ? (options.visibleState ? "text" : "password") : type}
            autoComplete={autoComplete}
            value={values[field]}
            onChange={(event) => setField(field, event.target.value)}
            aria-invalid={Boolean(errorId)}
            aria-describedby={[errorId, options?.hint ? `${id}-hint` : undefined].filter(Boolean).join(" ") || undefined}
            required={field !== "name" || mode === "register"}
            disabled={busy}
          />
          {options?.toggle && (
            <button className="auth-visibility" type="button" onClick={options.toggle}
              aria-label={options.visibleState ? "Ocultar senha" : "Mostrar senha"} aria-pressed={options.visibleState}>
              {options.visibleState ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          )}
        </div>
        {options?.hint && <span className="auth-field-hint" id={`${id}-hint`}>{options.hint}</span>}
        {errorId && <span className="auth-field-error" id={errorId} role="alert">{errors[field]}</span>}
      </div>
    );
  };

  if (mode === "callback") {
    const callbackReady = callbackStatus === "success" && !authLoading;
    const callbackFailed = callbackStatus === "error" || (!authLoading && Boolean(providerError));
    return (
      <AuthLayout eyebrow="ACESSO SEGURO" title={callbackFailed ? "Este link não abriu." : callbackReady ? "Tudo certo por aqui." : "Confirmando seu acesso…"}
        description={callbackFailed ? (providerError ?? "O link pode ter expirado ou ter sido aberto em outro navegador.") : callbackReady ? (recovery ? "Seu acesso de recuperação está pronto. Defina uma nova senha para continuar." : "Seu e-mail foi confirmado e sua sessão está pronta.") : "Estamos validando o link com segurança. Isso pode levar alguns segundos."}>
        <div className={`auth-result-card${callbackFailed ? " is-error" : ""}`}>
          <span className="auth-result-icon">{callbackFailed ? <Mail size={22} /> : callbackReady ? <Check size={22} /> : <LoaderCircle size={22} className="auth-spinning" />}</span>
          {callbackFailed ? (
            <>
              <strong>Abra o link no mesmo navegador</strong>
              <p>Por segurança, a confirmação usa uma chave temporária do navegador em que o pedido foi feito. Solicite um novo link se necessário.</p>
            </>
          ) : callbackReady ? (
            <>
              <strong>{recovery ? "Recuperação verificada" : "E-mail confirmado"}</strong>
              <p>{recovery ? "A redefinição de senha só fica disponível enquanto esta sessão de recuperação estiver ativa." : "Agora você pode seguir para o seu espaço de estudo."}</p>
            </>
          ) : (
            <>
              <strong>Um instante</strong>
              <p>Não feche esta página enquanto verificamos o link.</p>
            </>
          )}
        </div>
        {callbackFailed ? (
          <div className="auth-form"><Link href="/recuperar-senha" className="auth-primary-link">Solicitar recuperação <ArrowRight size={17} /></Link><Link href="/login">Entrar ou reenviar confirmação</Link></div>
        ) : callbackReady && recovery ? (
          <Link href="/redefinir-senha" className="auth-primary-link">Criar nova senha <ArrowRight size={17} /></Link>
        ) : callbackReady ? (
          <Link href={PLATFORM_HOME} className="auth-primary-link">Ir para o Painel <ArrowRight size={17} /></Link>
        ) : null}
        <p className="auth-security-note"><ShieldCheck size={15} /> Nunca compartilhe links de acesso.</p>
      </AuthLayout>
    );
  }

  const config = {
    login: { eyebrow: "BOM TER VOCÊ DE VOLTA", title: "Entre no seu espaço.", description: "Continue de onde parou. Sem pressa, com um próximo passo claro." },
    register: { eyebrow: "COMECE POR AQUI", title: "Seu estudo, com direção.", description: "Crie sua conta e organize o caminho que faz sentido para você." },
    forgot: { eyebrow: "RECUPERAR ACESSO", title: "Vamos resolver isso.", description: "Informe o e-mail da sua conta. Se ela existir, enviaremos um link de recuperação." },
    reset: { eyebrow: "NOVA SENHA", title: "Escolha uma senha nova.", description: "Use uma senha que você ainda não tenha usado nesta conta." },
  }[mode];

  const recoveryInvalid = mode === "reset" && !authLoading && (!recovery || !user);
  const showForm = !confirmationPending && !needsRecoveryLink && !passwordUpdated && !(mode === "reset" && recoveryInvalid);
  const footer = mode === "login" ? <>Ainda não tem conta? <Link href="/cadastro">Criar uma conta</Link></>
    : mode === "register" ? <>Já tem uma conta? <Link href="/login">Entrar</Link></>
    : mode === "forgot" || mode === "reset" ? <Link href="/login"><ArrowLeft size={15} /> Voltar para entrar</Link> : null;

  return (
    <AuthLayout eyebrow={config.eyebrow} title={config.title} description={config.description} footer={footer}>
      {loginUpdated && mode === "login" && <div className="auth-alert is-success" role="status"><Check size={17} /> Senha atualizada. Entre novamente com sua nova senha.</div>}
      {providerError && <div className="auth-alert is-error" role="alert">{providerError}</div>}
      {problem && <div className="auth-alert is-error" role="alert">{problem}</div>}

      {confirmationPending && (
        <div className="auth-confirmation">
          <span className="auth-result-icon"><Mail size={22} /></span>
          <h3>Confira sua caixa de entrada.</h3>
          <p>{message}</p>
          <p className="auth-confirmation-email">{values.email}</p>
          {resendNote}
          <button type="button" className="auth-secondary-button" onClick={() => { setConfirmationPending(false); setMessage(""); }} disabled={busy}>Usar outro e-mail</button>
        </div>
      )}

      {needsRecoveryLink && (
        <div className="auth-confirmation">
          <span className="auth-result-icon"><KeyRound size={22} /></span>
          <h3>Este acesso não é de recuperação.</h3>
          <p>Para proteger sua conta, uma nova senha só pode ser definida depois de abrir o link enviado ao seu e-mail neste mesmo navegador.</p>
          <Link href="/recuperar-senha" className="auth-primary-link">Solicitar um novo link <ArrowRight size={17} /></Link>
        </div>
      )}

      {passwordUpdated && (
        <div className="auth-confirmation">
          <span className="auth-result-icon"><Check size={22} /></span>
          <h3>Senha atualizada.</h3>
          <p>Por segurança, encerre a sessão de recuperação antes de entrar novamente com sua nova senha.</p>
          <button type="button" className="auth-submit" onClick={finishReset} disabled={busy}>
            {busy ? "Encerrando sessão…" : <>Sair e ir para entrar <ArrowRight size={17} /></>}
          </button>
        </div>
      )}

      {mode === "reset" && recoveryInvalid && !needsRecoveryLink && (
        <div className="auth-confirmation">
          <span className="auth-result-icon"><KeyRound size={22} /></span>
          <h3>Precisamos verificar o link.</h3>
          <p>Abra o link de recuperação no mesmo navegador em que você solicitou a troca de senha. Se expirou, peça outro.</p>
          <Link href="/recuperar-senha" className="auth-primary-link">Solicitar novo link <ArrowRight size={17} /></Link>
        </div>
      )}

      {showForm && (
        <form className="auth-form" onSubmit={submit} noValidate>
          {mode === "register" && inputField("name", "Como podemos chamar você?", "text", "name")}
          {(mode === "login" || mode === "register" || mode === "forgot") && inputField("email", "E-mail", "email", mode === "register" ? "email" : "username")}
          {(mode === "login" || mode === "register" || mode === "reset") && inputField("password", mode === "reset" ? "Nova senha" : "Senha", "password", mode === "login" ? "current-password" : "new-password", {
            visible: true, visibleState: showPassword, toggle: () => setShowPassword((value) => !value),
            hint: mode !== "login" ? "Pelo menos 8 caracteres." : undefined,
          })}
          {(mode === "register" || mode === "reset") && inputField("confirmation", "Confirme a senha", "password", "new-password", {
            visible: true, visibleState: showConfirmation, toggle: () => setShowConfirmation((value) => !value),
          })}
          {mode === "login" && <div className="auth-forgot-row"><span>Esqueceu a senha?</span><Link href="/recuperar-senha">Recuperar acesso</Link></div>}
          {mode === "login" && unconfirmed && <button type="button" className="auth-secondary-button" onClick={resendConfirmation} disabled={busy || cooldown > 0}>{cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar confirmação"}</button>}
          {mode === "login" && message && <p role="status">{message}</p>}
          <button className="auth-submit" type="submit" disabled={busy || (mode === "forgot" && cooldown > 0) || (mode === "reset" && (authLoading || !recovery || !user))}>
            {busy ? <><LoaderCircle size={17} className="auth-spinning" /> Aguarde…</> : <>{mode === "login" ? "Entrar" : mode === "register" ? "Criar minha conta" : mode === "forgot" ? "Enviar link de recuperação" : "Atualizar senha"} <ArrowRight size={17} /></>}
          </button>
          {mode === "forgot" && message && <div className="auth-alert is-success" role="status"><Mail size={17} />{message}<span className="auth-cooldown">{cooldown > 0 ? `Você poderá pedir outro link em ${cooldown}s.` : ""}</span></div>}
          {mode === "register" && <p className="auth-form-footnote">Você precisará confirmar seu e-mail antes de continuar.</p>}
        </form>
      )}
    </AuthLayout>
  );
}
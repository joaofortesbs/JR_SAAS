import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import AuthPage from "./pages/Auth";
import AccountPage from "./pages/Account";
import AppShell from "./components/AppShell";
import Panel from "./pages/Panel";
import NotFound from "./pages/NotFound";
import { PLATFORM_HOME } from "./lib/navigation";
import { StudyProvider } from "./lib/study";
import Exams, { ExamDetail } from "./pages/Exams";
import Flows from "./pages/Flows";
import Essays from "./pages/Essays";
import Routine from "./pages/Routine";

function Platform() {
  const { loading, user, error, recovery } = useAuth();
  if (loading) return <main className="min-h-screen grid place-items-center"><p role="status">Restaurando sua sessão…</p></main>;
  if (error && !user) return <main className="page-frame"><p role="alert">{error}</p><a href="/login">Voltar ao login</a></main>;
  if (!user) return <Redirect to="/login" />;
  if (recovery) return <Redirect to="/redefinir-senha" />;
  return <StudyProvider key={user.id} ownerId={user.id}><AppShell><Switch>
    <Route path="/"><Redirect to={PLATFORM_HOME} /></Route>
    <Route path="/painel"><Panel /></Route>
    <Route path="/conta"><AccountPage embedded /></Route>
    <Route path="/hoje"><Redirect to={PLATFORM_HOME} /></Route>
    <Route path="/evolucao"><Redirect to={PLATFORM_HOME} /></Route>
    <Route path="/provas/:id">{params => <ExamDetail id={Number(params.id)} />}</Route>
    <Route path="/provas"><Exams /></Route>
    <Route path="/flows"><Flows /></Route>
    <Route path="/redacoes/nova"><Essays /></Route>
    <Route path="/redacoes/:id"><Essays /></Route>
    <Route path="/redacoes"><Essays /></Route>
    <Route path="/rotina"><Routine /></Route>
    <Route path="/configuracoes"><Redirect to="/conta" /></Route>
    <Route><NotFound /></Route>
  </Switch></AppShell></StudyProvider>;
}
export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster />
    <Switch>
      <Route path="/login"><AuthPage mode="login" /></Route>
      <Route path="/cadastro"><AuthPage mode="register" /></Route>
      <Route path="/recuperar-senha"><AuthPage mode="forgot" /></Route>
      <Route path="/redefinir-senha"><AuthPage mode="reset" /></Route>
      <Route path="/auth/callback"><AuthPage mode="callback" /></Route>
      <Route><Platform /></Route>
    </Switch>
  </TooltipProvider></ThemeProvider></ErrorBoundary>;
}
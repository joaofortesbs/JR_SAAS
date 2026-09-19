import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Panel from "@/pages/Panel";
import Exams, { ExamDetail } from "@/pages/Exams";
import Flows from "@/pages/Flows";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { useEffect } from "react";

function ExamDetailRoute() {
  const [location] = useLocation();
  return <ExamDetail id={Number(location.split("/").pop())} />;
}

function LegacyBlockRedirect() {
  const [location, setLocation] = useLocation();
  useEffect(() => { const id = location.split("/").pop(); setLocation(`/flows?block=${id}`, { replace: true }); }, [location, setLocation]);
  return <div className="page-frame"><div className="soft-card p-10">Abrindo este bloco nos Flows…</div></div>;
}

function Router() {
  return <Switch>
    <Route path="/" component={Panel} />
    <Route path="/painel" component={Panel} />
    <Route path="/hoje" component={Panel} />
    <Route path="/evolucao" component={Panel} />
    <Route path="/provas" component={Exams} />
    <Route path="/provas/:examId" component={ExamDetailRoute} />
    <Route path="/flows" component={Flows} />
    <Route path="/plano" component={Flows} />
    <Route path="/plano/:blockId" component={LegacyBlockRedirect} />
    <Route path="/redacoes" component={Home} />
    <Route path="/redacoes/nova" component={Home} />
    <Route path="/redacoes/:essayId" component={Home} />
    <Route path="/biblioteca" component={Home} />
    <Route path="/rotina" component={Home} />
    <Route path="/configuracoes" component={Home} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/hoje" component={Home} />
    <Route path="/plano" component={Home} />
    <Route path="/plano/:blockId" component={Home} />
    <Route path="/provas" component={Home} />
    <Route path="/provas/:examId" component={Home} />
    <Route path="/rotina" component={Home} />
    <Route path="/biblioteca" component={Home} />
    <Route path="/redacoes" component={Home} />
    <Route path="/redacoes/nova" component={Home} />
    <Route path="/redacoes/:essayId" component={Home} />
    <Route path="/evolucao" component={Home} />
    <Route path="/configuracoes" component={Home} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

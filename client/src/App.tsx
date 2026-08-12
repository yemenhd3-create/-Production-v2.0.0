import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const CanvasVisualCheck = lazy(() => import('./components/CanvasVisualCheck'));
const PersonalAccessGate = lazy(() => import('./components/PersonalAccessGate'));
const AuthenticatedApplication = lazy(() => import('./components/AuthenticatedApplication'));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={PersonalHome} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function PersonalHome() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('canvas-visual-check')) {
    return <Suspense fallback={<LoadingScreen text="جارٍ تجهيز معاينة القالب…" />}><CanvasVisualCheck /></Suspense>;
  }
  return <Suspense fallback={<LoadingScreen text="جارٍ فتح مساحتك الشخصية…" />}><PersonalAccessGate><Suspense fallback={<LoadingScreen text="جارٍ تجهيز مولد الإعلانات…" />}><AuthenticatedApplication /></Suspense></PersonalAccessGate></Suspense>;
}

function LoadingScreen({ text }: { text: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#fffdf6] p-6" dir="rtl"><section className="rounded-3xl bg-white px-7 py-6 text-center shadow-[0_12px_32px_rgba(37,35,95,0.08)]"><span className="mx-auto block h-7 w-7 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" /><p className="mt-3 text-sm font-bold text-primary">{text}</p></section></main>;
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <Router />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

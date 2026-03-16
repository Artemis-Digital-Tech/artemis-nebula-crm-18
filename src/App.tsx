import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Activate from "./pages/Activate";
import Plans from "./pages/Plans";
import Dashboard from "./pages/Dashboard";
import LeadForm from "./pages/LeadForm";
import Leads from "./pages/Leads";
import Categories from "./pages/Categories";
import CategoryManager from "./pages/CategoryManager";
import ValueTypeManager from "./pages/ValueTypeManager";
import StatusManager from "./pages/StatusManager";
import LeadSearch from "./pages/LeadSearch";
import Agents from "./pages/Agents";
import AgentCreate from "./pages/AgentCreate";
import AgentScripts from "./pages/AgentScripts";
import { ComponentConfiguration } from "./pages/ComponentConfiguration";
import Documents from "./pages/Documents";
import AIContextDocuments from "./pages/AIContextDocuments";
import WhatsAppConnect from "./pages/WhatsAppConnect";
import InstagramConfiguration from "./pages/InstagramConfiguration";
import MediaSenderConfiguration from "./pages/MediaSenderConfiguration";
import Settings from "./pages/Settings";
import MessageConfiguration from "./pages/MessageConfiguration";
import ScheduleMessages from "./pages/ScheduleMessages";
import ScheduleInteractions from "./pages/ScheduleInteractions";
import NotFound from "./pages/NotFound";
import ChatComingSoon from "./pages/ChatComingSoon";
import ProtectedRoute from "./components/ProtectedRoute";
import { AbilitiesConfiguration } from "./pages/AbilitiesConfiguration";
import { OAuthCallback } from "./pages/OAuthCallback";
import { Calendar } from "./pages/Calendar";
import Playground from "./pages/Playground";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/planos" element={<Plans />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/activate" element={<Activate />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <Leads />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lead/:id"
              element={
                <ProtectedRoute>
                  <LeadForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute>
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/category-manager"
              element={
                <ProtectedRoute>
                  <CategoryManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/value-types"
              element={
                <ProtectedRoute>
                  <ValueTypeManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/status-manager"
              element={
                <ProtectedRoute>
                  <StatusManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lead-search"
              element={
                <ProtectedRoute>
                  <LeadSearch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-interaction"
              element={
                <ProtectedRoute>
                  <Agents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-interaction/create"
              element={
                <ProtectedRoute>
                  <AgentCreate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-interaction/edit/:id"
              element={
                <ProtectedRoute>
                  <AgentCreate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent-scripts"
              element={
                <ProtectedRoute>
                  <AgentScripts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/abilities"
              element={
                <ProtectedRoute>
                  <AbilitiesConfiguration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-context-documents"
              element={
                <ProtectedRoute>
                  <AIContextDocuments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/components/:id/configure"
              element={
                <ProtectedRoute>
                  <ComponentConfiguration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/whatsapp"
              element={
                <ProtectedRoute>
                  <WhatsAppConnect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instagram"
              element={
                <ProtectedRoute>
                  <InstagramConfiguration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/media-sender"
              element={
                <ProtectedRoute>
                  <MediaSenderConfiguration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <Documents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/message-configuration"
              element={
                <ProtectedRoute>
                  <MessageConfiguration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule-messages"
              element={
                <ProtectedRoute>
                  <ScheduleMessages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule-interactions"
              element={
                <ProtectedRoute>
                  <ScheduleInteractions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatComingSoon />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playground"
              element={
                <ProtectedRoute>
                  <Playground />
                </ProtectedRoute>
              }
            />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

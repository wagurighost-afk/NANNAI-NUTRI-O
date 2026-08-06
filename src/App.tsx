import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';
import { SplashPage } from './pages/auth/SplashPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RecoverPasswordPage } from './pages/auth/RecoverPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { NewAuditPage } from './pages/audits/NewAuditPage';
import { AuditsListPage } from './pages/audits/AuditsListPage';
import { AuditExecutionPage } from './pages/audits/AuditExecutionPage';
import { AuditSummaryPage } from './pages/audits/AuditSummaryPage';
import { AuditClosingPage } from './pages/audits/AuditClosingPage';
import { AuditDetailPage } from './pages/audits/AuditDetailPage';
import { ActionPlansPage } from './pages/action-plans/ActionPlansPage';
import { ActionPlanDetailPage } from './pages/action-plans/ActionPlanDetailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { IndicatorsPage } from './pages/indicators/IndicatorsPage';
import { UsersPage } from './pages/users/UsersPage';
import { UnitsPage } from './pages/units/UnitsPage';
import { QuestionnairesPage } from './pages/questionnaires/QuestionnairesPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ReportRecipientsPage } from './pages/email/ReportRecipientsPage';
import { EmailHistoryPage } from './pages/email/EmailHistoryPage';
import { useAuthStore } from './stores/authStore';

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function PublicOnly() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return <Outlet />;
}

function ManagerRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user || (user.role !== 'admin' && user.role !== 'gestor')) {
    return <Navigate to="/app" replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />

      <Route element={<PublicOnly />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-senha" element={<RecoverPasswordPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="auditorias" element={<AuditsListPage />} />
          <Route path="auditorias/nova" element={<NewAuditPage />} />
          <Route path="auditorias/:id" element={<AuditDetailPage />} />
          <Route path="auditorias/:id/executar" element={<AuditExecutionPage />} />
          <Route path="auditorias/:id/resumo" element={<AuditSummaryPage />} />
          <Route path="auditorias/:id/encerrar" element={<AuditClosingPage />} />
          <Route path="planos-de-acao" element={<ActionPlansPage />} />
          <Route path="planos-de-acao/:id" element={<ActionPlanDetailPage />} />
          <Route path="relatorios" element={<ReportsPage />} />
          <Route path="indicadores" element={<IndicatorsPage />} />
          <Route element={<ManagerRoute />}>
            <Route path="destinatarios-relatorios" element={<ReportRecipientsPage />} />
            <Route path="historico-emails" element={<EmailHistoryPage />} />
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="unidades" element={<UnitsPage />} />
            <Route path="questionarios" element={<QuestionnairesPage />} />
          </Route>
          <Route path="configuracoes" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";

import StudentRegister from "./pages/StudentRegister";
import Admin from "./pages/Admin";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDocuments from "./pages/AdminDocuments";
import AdminEscalations from "./pages/AdminEscalations";
import AdminEscalationDetail from "./pages/AdminEscalationDetail";
import AdminStudents from "./pages/AdminStudents";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StudentRegister />} />
      <Route path="/admin" element={<Admin />}>
        <Route index element={<AdminDashboard />} />
        <Route path="documents" element={<AdminDocuments />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="escalations" element={<AdminEscalations />} />
        <Route path="escalations/:id" element={<AdminEscalationDetail />} />
        <Route path="analytics" element={<AdminAnalytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

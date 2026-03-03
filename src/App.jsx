import { useEffect, useState, createContext, useContext } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import "./App.css";
import Navbar from "./Components/Navbar";
import DocumentTable from "./Components/DocumentTable";
import StartupDashboard from "./Components/StartupDashboard/StartupDashboard";
import LoginForm from "./Components/Login/LoginForm";
import ProtectedRoute from "./Components/ProtectedRoute";
import { DataProvider } from "./Components/Datafetching/DataProvider";
import DocumentManagementPage from "./Components/DocumentUpload/DocumentManagementPage";
import UserManagementPage from "./Components/UsersAdd/UserManagementPage";
import UserAssociation from "./Components/UserAssociation/UserAssociation";
import { InactivityHandler } from "./Components/Datafetching/InactivityHandler";
import ChatHistory from "./Components/ChatApp/ChatHistory";
import ChatApp from "./Components/ChatApp/ChatApp";
import IncubationManagementPage from "./Components/Incubation/IncubationManagementPage";
import RolesManagement from "./Components/RoleManagement/RolesManagement";
import ApplicationManagement from "./Components/ApplicationManagement/ApplicationManagement";
import MainDashboard from "./Components/MainDashboard";
import DocumentAccessManagement from "./Components/DocumentAccessManagement/DocumentAccessManagement";
import TrainingManagementPage from "./Components/TrainingManagement/TrainingManagementPage";
import IncubeeAssignment from "./Components/MentorIncubateeList/IncubateeAssignment";

import ResetPassword from "./Components/Login/ResetPassword";
import IncubateeTable from "./Components/IncubateeManagement/IncubateeTable";
import MentorDashboard from "./Components/MentorDashboard/MentorDashboard";
// Create a context for authentication state

import MentorAssociation from "./Components/MentorAssociation/MentorAssociation";
import MentorManagementPage from "./Components/MentorClassification/MentorManagementPage";
import TrainingAssignment from "./Components/MentorTrainingAssignment/TrainingAssignment";
import CoursesPage from "./Components/Courses/CoursesPage";

export const AuthContext = createContext();

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is logged in by checking for token in sessionStorage
    const token = sessionStorage.getItem("token");
    setIsAuthenticated(!!token);

    // If user is on login page but already authenticated, redirect to dashboard
    if (!!token && location.pathname === "/") {
      navigate("/Incubation/Dashboard", { replace: true });
    }

    // Initialize body class for sidebar state
    if (location.pathname === "/") {
      // On login page, remove all sidebar-related classes
      document.body.classList.remove("sidebar-expanded", "sidebar-collapsed");
    } else if (!!token) {
      // On authenticated pages, start with collapsed sidebar
      document.body.classList.add("sidebar-collapsed");
      document.body.classList.remove("sidebar-expanded");
    }
  }, [location.pathname, navigate]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      <div className="app-container">
        {/* Only render Navbar if authenticated and not on login page */}
        {isAuthenticated && location.pathname !== "/" && <Navbar />}
        <div
          className={`content-container ${
            isAuthenticated && location.pathname !== "/" ? "with-sidebar" : ""
          }`}
        >
          <Routes>
            <Route path="/" element={<LoginForm />} />
            <Route
              path="/Incubation/Dashboard"
              element={
                <ProtectedRoute allowedRoles={[0, 1, 3, 7, 9]}>
                  <MainDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/startup/Dashboard"
              element={
                <ProtectedRoute allowedRoles={[0, 1, 3, 4, 7]}>
                  <StartupDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/Incubation"
              element={
                <ProtectedRoute>
                  <IncubationManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/AddDocuments"
              element={
                <ProtectedRoute>
                  <DocumentManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/Usermanagement"
              element={
                <ProtectedRoute>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/Userassociation"
              element={
                <ProtectedRoute>
                  <UserAssociation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/Chats"
              element={
                <ProtectedRoute>
                  <ChatApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/ChatHistory"
              element={
                <ProtectedRoute>
                  <ChatHistory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/Incubation/Dashboard/Roles"
              element={
                <ProtectedRoute>
                  <RolesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/Applications"
              element={
                <ProtectedRoute>
                  <ApplicationManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/TrainingManagementPage"
              element={
                <ProtectedRoute>
                  <TrainingManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/MentorDashboard"
              element={
                <ProtectedRoute>
                  <MentorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/MentorIncubateeList"
              element={
                <ProtectedRoute>
                  <IncubeeAssignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/TrainingAssignment"
              element={
                <ProtectedRoute>
                  <TrainingAssignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/MentorManagement"
              element={
                <ProtectedRoute>
                  <MentorManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/MentorAssociation"
              element={
                <ProtectedRoute>
                  <MentorAssociation />
                </ProtectedRoute>
              }
            />

            <Route
              path="/startup/Dashboard/DocumentAccessManagement"
              element={
                <ProtectedRoute>
                  <DocumentAccessManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/startup/Dashboard/Courses"
              element={
                <ProtectedRoute>
                  <CoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Incubation/Dashboard/IncubateeManagement"
              element={
                <ProtectedRoute>
                  <IncubateeTable />
                </ProtectedRoute>
              }
            />

            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </div>
      </div>
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <InactivityHandler>
          <AppContent />
        </InactivityHandler>
      </DataProvider>
    </BrowserRouter>
  );
}

export default App;

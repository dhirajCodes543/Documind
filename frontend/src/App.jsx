import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./Authcontext";
import ProtectedRoute from "./Protectedroute";
import SignUp from "./pages/Signup";
import SignIn from "./pages/Signin";
import Chat from "./pages/Chat";
import LatestNews from "./Components/LatestNews";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root → redirect to /chat */}
          <Route path="/" element={<Navigate to="/chat" replace />} />

          {/* New chat */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/latest-news"
            element={
              <ProtectedRoute>
                <LatestNews />
              </ProtectedRoute>
            }
          />

          {/* Existing chat by ID */}
          <Route
            path="/chat/:chatId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />

          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
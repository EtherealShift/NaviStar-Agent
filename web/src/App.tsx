import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import McpPage from "@/pages/McpPage";
import ToastContainer from "@/components/Toast";

const isElectron = typeof window !== "undefined" && !!window.electronAPI;

export default function App() {
  return (
    <Router>
      <div className={isElectron ? "h-screen" : ""}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mcp" element={<McpPage />} />
        </Routes>
      </div>
      <ToastContainer />
    </Router>
  );
}

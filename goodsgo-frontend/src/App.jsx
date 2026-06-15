
import LoginForm from "./components/auth/LoginForm"
import RegisterForm from "./components/auth/RegisterForm"
import { BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import HomePage from "./pages/HomePage"

function App() {
  const isAuthenticated = false; //this will come from teh auth context
  return (
    <>
      <Router>
        <div className="App">
          {/* <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginForm />}/>
            
          </Routes> */}
        </div>
      </Router>
      <LoginForm/>
      <HomePage/>
    </>
  )
}

export default App







// https://chatgpt.com/share/68e5152e-02a4-800e-91f1-9a5f17f148f0
// https://chatgpt.com/share/68e5152e-02a4-800e-91f1-9a5f17f148f0
import { getMe, performLogin, signUp } from "./api/authService"
import { SignUpPage } from "./pages/SignUpPage"

function App() {
  return (
    <>
    <SignUpPage/>
    <button className="mr-3" onClick={() => performLogin({ email: 'test@example.com', password: 'password1' })}>Login</button>
    <button className="mr-3" onClick={() => getMe()}>Get Me</button>
    <button onClick={() => signUp({ username: 'hellosdsssassd',email: 'teasssssjdndnt@example.com', password: 'password1' })}>Sign Up</button>
    </>
  )
}

export default App

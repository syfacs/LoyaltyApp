import { createRoot } from 'react-dom/client'
import Home from './renders/Home.jsx'
import './styles/index.css'

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <Home />
  // </StrictMode>,
)


import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom' //BrowserRouter is a component from react-router-dom used to manage routing in a React application. It enables the use of the HTML5 history API to handle navigation and URL management. It allows the app to respond to URL changes and renders different components based on the route.
import AppContextProvider from './context/AppContext.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppContextProvider>
      <App />
    </AppContextProvider>
  </BrowserRouter>
)

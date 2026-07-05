import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { UiProvider } from './context/UiContext.jsx'
import './index.css'

// TODO: cuando corras "npm install" en client/, descomentar estos imports
// y quitar los <link> de Google Fonts del index.html:
// import '@fontsource/inter/400.css'
// import '@fontsource/inter/500.css'
// import '@fontsource/inter/600.css'
// import '@fontsource/inter/700.css'
// import '@fontsource/plus-jakarta-sans/400.css'
// import '@fontsource/plus-jakarta-sans/600.css'
// import '@fontsource/plus-jakarta-sans/700.css'
// import '@fontsource/plus-jakarta-sans/800.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <UiProvider>
        <App />
      </UiProvider>
    </BrowserRouter>
  </React.StrictMode>
)

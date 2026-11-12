import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (new URLSearchParams(location.search).has('gallery')) {
  // Dev aid: the art gallery (?gallery or ?gallery=tiles,ghosts). Imports only src/ui/art/.
  void import('./ui/art/Gallery').then(({ GalleryPage }) => root.render(<GalleryPage />))
} else {
  void import('./App').then(({ App }) =>
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    ),
  )
}

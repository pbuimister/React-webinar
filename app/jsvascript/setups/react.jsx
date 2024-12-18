import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import KanbanBoardApp from '../apps/KanbanBoardApp'

const rootMap = new Map()
const queryClient = new QueryClient()

function initializeApps(apps) {
  apps.forEach(({ component: Component, elementId }) => {
    const element = document.getElementById(elementId)
    if (element) {
      const props = JSON.parse(element.getAttribute('data-props') || '{}')

      let root
      if (rootMap.has(element)) {
        root = rootMap.get(element)
      } else {
        root = createRoot(element)
        rootMap.set(element, root)
      }

      // eslint-disable-next-line no-console
      console.log(`Rendering component for elementId: ${elementId}`)
      root.render(
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            <Component {...props} />
            <ReactQueryDevtools />
          </QueryClientProvider>
        </StrictMode>
      )
    }
  })
}

const apps = [
  { component: KanbanBoardApp, elementId: 'kanban-board-app' }
]

document.addEventListener('turbolinks:load', () => {
  initializeApps(apps)
})

document.addEventListener('turbolinks:before-cache', () => {
  rootMap.forEach((root, element) => {
    root.unmount()
  })
  rootMap.clear()
})

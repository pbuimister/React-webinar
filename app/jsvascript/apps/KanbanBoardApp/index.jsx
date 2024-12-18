import React from 'react'
import PropTypes from 'prop-types'
import { BoardProvider } from './context/BoardContext'
import KanbanBoardAppContent from './components/KanbanBoardAppContent'

function KanbanBoardApp({ columns, settings }) {
  return (
    <BoardProvider columns={columns} settings={settings}>
      <KanbanBoardAppContent />
    </BoardProvider>
  )
}

KanbanBoardApp.propTypes = {
  columns: PropTypes.array.isRequired,
  settings: PropTypes.object
}

export default KanbanBoardApp

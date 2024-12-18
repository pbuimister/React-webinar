import React, { createContext, useContext, useMemo, useState } from 'react'
import invariant from 'tiny-invariant'
import PropTypes from 'prop-types'
import { useMutation, useQuery } from '@tanstack/react-query'
import AppService from '@services/AppService'

const BoardContext = createContext(null)

function useBoardContext() {
  const context = useContext(BoardContext)
  invariant(context, 'useBoardContext must be used within a BoardProvider')
  return context
}

function BoardProvider({ children, columns, settings }) {
  const [columnsData, setColumnsData] = useState({})
  const params = useMemo(() => new URLSearchParams({ traits: '[board]' }), [])

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => AppService.users.collection(params.toString()),
    retry: 1
  })

  const updateJobMutation = useMutation({
    mutationFn: jobData => AppService.jobs.update(jobData.id, { job: jobData })
  })

  const accessible = useMemo(() => ({
    columns,
    columnsData,
    setColumnsData,
    settings,
    updateJobMutation,
    usersQuery
  }), [columns, columnsData, setColumnsData, settings, updateJobMutation, usersQuery])

  return (
    <BoardContext.Provider value={accessible}>
      {children}
    </BoardContext.Provider>
  )
}

BoardProvider.propTypes = {
  children: PropTypes.node.isRequired,
  columns: PropTypes.array.isRequired,
  settings: PropTypes.object
}

export { BoardProvider, useBoardContext }

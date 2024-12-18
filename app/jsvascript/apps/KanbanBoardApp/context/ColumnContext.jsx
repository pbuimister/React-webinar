import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import PropTypes from 'prop-types'
import { useInfiniteQuery } from '@tanstack/react-query'
import AppService from '@services/AppService'
import { useBoardContext } from './BoardContext'

const ColumnContext = createContext(null)

function useColumnContext() {
  const context = useContext(ColumnContext)
  invariant(context, 'useColumnContext must be used within a ColumnProvider')
  return context
}

const ColumnProvider = ({ children, columnId, columnName }) => {
  const { columnsData, setColumnsData } = useBoardContext()
  const prevPagesRef = useRef()
  const lastPageRef = useRef(null)
  const [fetchedNewPage, setFetchedNewPage] = useState(false)

  function fetchJobs({ pageParam }) {
    const params = new URLSearchParams(window.location.search)
    params.set('traits', '[board]')
    params.set('status', columnId)
    params.set('page', pageParam)
    return AppService.jobs.collection(params.toString())
  }

  const collectAllJobs = useCallback((pages) => {
    if (Array.isArray(pages)) {
      return pages.reduce((acc, page) => [...acc, ...page.jobs], [])
    }
    return pages.jobs
  }, [])

  const jobsQuery = useInfiniteQuery({
    queryKey: ['jobs', { status: columnName }],
    queryFn: fetchJobs,
    initialPageParam: 1,
    getNextPageParam: lastPage => lastPage.meta.next_page
  })

  const currentColumnData = useMemo(() => columnsData[columnName], [columnsData, columnName])

  function fetchNextPage() {
    jobsQuery.fetchNextPage()
    setFetchedNewPage(true)
  }

  useEffect(() => {
    if (jobsQuery.status === 'success' || jobsQuery.isFetched) {
      const pages = jobsQuery.data?.pages
      if (fetchedNewPage) {
        setFetchedNewPage(false)
        const lastPage = pages.slice(-1)[0]

        if (lastPageRef.current !== lastPage) {
          lastPageRef.current = lastPage
          const newJobs = collectAllJobs(lastPage)

          setColumnsData((prev) => {
            const existingJobs = prev[columnName] || []
            const uniqueJobs = newJobs.filter(job => !existingJobs.some(existingJob => existingJob.id === job.id))

            return {
              ...prev,
              [columnName]: [
                ...existingJobs,
                ...uniqueJobs
              ]
            }
          })
        }
      } else {
        setColumnsData(prev => ({
          ...prev,
          [columnName]: collectAllJobs(pages)
        }))
      }

      prevPagesRef.current = jobsQuery.data.pages
    }
  }, [collectAllJobs, jobsQuery.data, jobsQuery.isFetched, jobsQuery.status, columnName, setColumnsData])

  return (
    <ColumnContext.Provider value={{ columnName, jobsQuery, fetchNextPage, jobs: currentColumnData || [] }}>
      {children}
    </ColumnContext.Provider>
  )
}

ColumnProvider.propTypes = {
  children: PropTypes.node.isRequired,
  columnName: PropTypes.string.isRequired
}

export { ColumnProvider, useColumnContext }

import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import invariant from 'tiny-invariant'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import Loader from '@elements/Loader'
import Notice from '@elements/Notice'
import { useColumnContext } from '../context/ColumnContext'
import Card from './Card'

function Column() {
  const { columnName, jobsQuery, jobs, fetchNextPage } = useColumnContext()
  const [loading, setLoading] = useState(true)
  const columnRef = useRef(null)
  const [isDraggedOver, setIsDraggedOver] = useState(false)

  useEffect(() => {
    const columnElm = columnRef.current
    invariant(columnElm)

    const { onDragStart, onDragEnter, onDragLeave, onDrop } = {
      onDragStart: () => setIsDraggedOver(true),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false)
    }

    return dropTargetForElements({
      element: columnElm,
      onDragStart,
      onDragEnter,
      onDragLeave,
      onDrop,
      getData: () => ({ columnName }),
      getIsSticky: () => true
    })
  }, [columnName])

  useEffect(() => {
    if (jobsQuery.status === 'success') {
      setLoading(false)
    }
  }, [jobsQuery.status])

  function renderLoadMore() {
    return (
      <div className="load-more">
        {jobsQuery.isFetchingNextPage ? <Loader /> : (
          <button
            onClick={() => fetchNextPage()}
            disabled={jobsQuery.isFetchingNextPage}
          >
            Load More
          </button>
        )}
      </div>
    )
  }

  function renderCards() {
    if (jobsQuery.status === 'error') {
      return <Notice message={jobsQuery.error.message} type={jobsQuery.status} />
    }

    if (loading) {
      return <Loader />
    }

    return (
      <>
        {jobs.map((job, index) => (
          <Card key={`job-${job.id}`} columnName={columnName} index={index} initialJob={job} />
        ))}
        {jobsQuery.hasNextPage && renderLoadMore()}
      </>
    )
  }

  return (
    <div className="board-column">
      <div className="board-column-header">
        {columnName}
      </div>
      <div
        ref={columnRef}
        className={classNames('board-column-cards', { 'dragged-over': isDraggedOver })}
      >
        {renderCards()}
      </div>
    </div>
  )
}

export default Column

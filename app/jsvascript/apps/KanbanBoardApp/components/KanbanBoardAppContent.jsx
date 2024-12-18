import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder'
import useWindowResize from '@hooks/useWindowResize'
import { useBoardContext } from '../context/BoardContext'
import { ColumnProvider } from '../context/ColumnContext'
import Column from './Column'

function KanbanBoardAppContent() {
  const boardRef = useRef(null)
  const { columns, columnsData, setColumnsData, updateJobMutation } = useBoardContext()

  const adjustBoardHeight = useCallback(() => {
    if (boardRef.current) {
      const margin = 50
      boardRef.current.style.height = `${window.innerHeight - boardRef.current.getBoundingClientRect().top - margin}px`
    }
  }, [])

  useWindowResize(adjustBoardHeight)

  function findColumnId(columnName) {
    const column = columns.find(columnData => columnData.name === columnName)
    return column ? column.id : null
  }

  async function updateDraggedCard(job, index, status = {}) {
    try {
      await updateJobMutation.mutateAsync({
        ...job,
        ...status,
        board_order_position: index
      }, {
        onError: (message) => {
          window.toastr.error(message)
        },
        onSuccess: () => {
          window.toastr.success('Job updated successfully')
        }
      })

      return null
    } catch (error) {
      throw error
    }
  }

  const reorderCard = useCallback(({
    initialColumnName, initialIndex, reorderDestinationIndex
  }) => {
    window.requestAnimationFrame(() => {
      const updatedItems = reorder({
        list: columnsData[initialColumnName],
        startIndex: initialIndex,
        finishIndex: reorderDestinationIndex
      })

      updateDraggedCard(updatedItems[reorderDestinationIndex], reorderDestinationIndex).then(() => {
        setColumnsData(prev => ({
          ...prev,
          [initialColumnName]: updatedItems
        }))
      })
    })
  }, [columnsData, setColumnsData])

  const moveCard = useCallback(({
    cardId, destinationColumnName, initialColumnName, initialIndex, moveDestinationIndex
  }) => {
    window.requestAnimationFrame(() => {
      const sourceColumnReorder = columnsData[initialColumnName].filter(card => card.id !== cardId)
      const newDestinationCards = [
        ...columnsData[destinationColumnName].slice(0, moveDestinationIndex),
        columnsData[initialColumnName][initialIndex],
        ...columnsData[destinationColumnName].slice(moveDestinationIndex)
      ]

      const status = {
        job_status_id: findColumnId(destinationColumnName)
      }

      updateDraggedCard(columnsData[initialColumnName][initialIndex], moveDestinationIndex, status).then(() => {
        setColumnsData(prev => ({
          ...prev,
          [initialColumnName]: sourceColumnReorder,
          [destinationColumnName]: newDestinationCards
        }))
      })
    })
  }, [columnsData, setColumnsData])

  const handleDrop = useCallback(({
    source, location
  }) => {
    const dropTargets = location?.current?.dropTargets || []
    const initialTargets = location?.initial?.dropTargets || []

    if (!dropTargets.length || source.data.type !== 'card') return

    const initialColumnName = initialTargets[1]?.data.columnName
    const initialColumnData = columnsData[initialColumnName]

    const draggedCard = {
      cardId: source.data.cardId,
      destinationColumnName: dropTargets.slice(-1)[0].data.columnName,
      initialColumnName,
      initialIndex: initialColumnData.findIndex(card => card.id === source.data.cardId),
      moveDestinationIndex: 0,
      sourceColumnDataLength: initialColumnData.length
    }

    if (dropTargets.length === 1) {
      if (initialColumnName === draggedCard.destinationColumnName) {
        draggedCard.reorderDestinationIndex = getReorderDestinationIndex({
          startIndex: draggedCard.index,
          indexOfTarget: draggedCard.sourceColumnDataLength - 1,
          closestEdgeOfTarget: null,
          axis: 'vertical'
        })

        reorderCard(draggedCard)

        return
      }
    } else {
      const [{ data: destinationCardRecord }, { data: { columnName } }] = dropTargets
      const indexOfTarget = columnsData[columnName].findIndex(card => card.id === destinationCardRecord.cardId)
      const closestEdgeOfTarget = extractClosestEdge(destinationCardRecord)

      if (initialColumnName === draggedCard.destinationColumnName) {
        draggedCard.reorderDestinationIndex = getReorderDestinationIndex({
          startIndex: draggedCard.index,
          indexOfTarget,
          closestEdgeOfTarget,
          axis: 'vertical'
        })

        reorderCard(draggedCard)

        return
      }

      draggedCard.moveDestinationIndex = closestEdgeOfTarget === 'bottom' ? indexOfTarget + 1 : indexOfTarget
    }

    moveCard(draggedCard)
  }, [columnsData, moveCard, reorderCard])

  useEffect(() => monitorForElements({ onDrop: handleDrop }), [handleDrop])

  const renderColumns = useMemo(() => columns.map(({ id, name }) => (
    <ColumnProvider key={id} columnId={id} columnName={name}>
      <Column />
    </ColumnProvider>
  )),
  [columns])

  return (
    <div className="board" ref={boardRef}>
      {renderColumns}
    </div>
  )
}

export default React.memo(KanbanBoardAppContent)

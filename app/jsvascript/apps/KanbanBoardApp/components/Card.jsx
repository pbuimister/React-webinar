import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import debounce from 'lodash.debounce'
import invariant from 'tiny-invariant'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import DatePickerElement from '@elements/DatePickerElement'
import Multiselect from '@elements/Multiselect'
import AppService from '@services/AppService'
import { titleize } from '@helpers'
import { useBoardContext } from '../context/BoardContext'

function Card({ columnName, index, initialJob }) {
  const cardRef = useRef(null)
  const [job, setJob] = useState(initialJob)
  const prevJobRef = useRef(initialJob)
  const { updateJobMutation, settings, usersQuery, setColumnsData } = useBoardContext()
  const users = usersQuery.data ? usersQuery.data.users : []
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState('')
  const [closestEdge, setClosestEdge] = useState(null)

  const handleUpdate = useCallback(
    debounce((jobData) => {
      updateJobMutation.mutate(jobData, {
        onError: (error) => {
          setStatus('error')
          window.toastr.error(error)
          setJob(prevJobRef.current)
        },
        onSuccess: () => {
          setStatus('success')
          window.toastr.success('Job updated successfully')
          prevJobRef.current = job
          setColumnsData((prevColumnsData) => {
            const newColumnsData = { ...prevColumnsData }
            newColumnsData[columnName][index] = jobData

            return newColumnsData
          })
        }
      })
    }, 1000),
    [updateJobMutation]
  )

  const handleChange = useCallback((field, value) => {
    setJob(prevJob => ({ ...prevJob, [field]: value }))
  }, [])

  useEffect(() => {
    if (prevJobRef.current !== job) {
      setStatus('')
      handleUpdate(job)
    }
    return () => handleUpdate.cancel()
  }, [job, handleUpdate])

  useEffect(() => {
    const cardElm = cardRef.current
    invariant(cardElm)

    const cleanup = combine(
      draggable({
        element: cardElm,
        getInitialData: () => ({ type: 'card', cardId: job.id }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false)
      }),
      dropTargetForElements({
        element: cardElm,
        getData: ({ input, element }) => {
          const data = { type: 'card', cardId: job.id }
          return attachClosestEdge(data, { input, element, allowedEdges: ['top', 'bottom'] })
        },
        getIsSticky: () => true,
        onDragEnter: (args) => {
          if (args.source.data.cardId !== job.id) {
            setClosestEdge(extractClosestEdge(args.self.data))
          }
        },
        onDrag: (args) => {
          if (args.source.data.cardId !== job.id) {
            setClosestEdge(extractClosestEdge(args.self.data))
          }
        },
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null)
      })
    )

    return () => {
      if (typeof cleanup === 'function') {
        cleanup()
      }
    }
  }, [job.id])

  const renderMembers = useMemo(() => {
    if (users.length === 0) {
      return null
    }

    return settings.members_fields.map(({ model, name }) => (
      <div key={name} className="board-card-members">
        <span>{name}</span>
        <Multiselect
          field={`${model}_ids`}
          onChange={handleChange}
          initialOptions={users}
          defaultValues={job[model]}
          placeholder={`Select ${name}`}
        />
      </div>
    ))
  }, [settings.members_fields, users, job, handleChange])

  const renderDates = useMemo(() => {
    if (!settings.date_fields || settings.date_fields.length === 0) {
      return null
    }
    return settings.date_fields.map(field => (
      <div className="board-card-date" key={field}>
        <span>{titleize(field)}</span>
        <DatePickerElement date={job[field]} field={field} onChange={handleChange}/>
      </div>
    ))
  }, [settings.date_fields, job, handleChange])

  const renderFields = useMemo(() => (
    <div className="mb-4 pl-2">
      {renderDates}
      {renderMembers}
    </div>
  ), [renderDates, users, job, handleChange])

  return (
    <div ref={cardRef} className={classNames('board-card', 'status-bar', status, { dragging: isDragging })}>
      <div className="board-card-header">
        <div className="board-card-name">
          <input
            type="text"
            value={job.name}
            title={job.name}
            onChange={e => handleChange('name', e.target.value)}
          />
          <p>{job.name}</p>
        </div>
        <div className="board-card-id">
          <a href={AppService.jobs.resourcePath(job.id)} className="link">#{job.id}</a>
        </div>
      </div>
      {renderFields}

      {closestEdge && <div className={`drop-indicator edge-${closestEdge}`}></div>}
    </div>
  )
}

Card.propTypes = {
  columnName: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  initialJob: PropTypes.object.isRequired
}

export default React.memo(Card)

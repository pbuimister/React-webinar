import React from 'react'

function Notice({ message, type }) {
  return (
    <div className={`notice p-4 mb-4 text-sm rounded-lg ${type}`}>
      {message}
    </div>
  )
}

export default Notice

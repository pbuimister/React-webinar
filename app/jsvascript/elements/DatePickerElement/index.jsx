import React from 'react'
import DatePicker from 'react-datepicker'
import moment from 'moment'
import PropTypes from 'prop-types'
import styles from './DatePickerElement.module.scss'

function DatePickerElement({ date, field, onChange }) {
  const selectedDate = date ? moment(date).toDate() : null

  function handleChange(selected) {
    if (selected) {
      onChange(field, moment(selected).format('YYYY-MM-DD'))
    } else {
      onChange(field, null)
    }
  }

  return (
    <div className={styles.wrapper}>
      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="dd MMM yyyy"
        placeholderText="Select a date"
        isClearable
        showYearDropdown
        showMonthDropdown
        dropdownMode="select"
      />
    </div>
  )
}

DatePickerElement.propTypes = {
  date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  field: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
}

export default React.memo(DatePickerElement)

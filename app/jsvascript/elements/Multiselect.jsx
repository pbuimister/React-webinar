import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import Select from '@atlaskit/select'
import { transformOptions } from '@helpers'

function Multiselect({
  field,
  onChange,
  initialOptions = [],
  defaultValues = [],
  placeholder = 'Select'
}) {
  const [options, setOptions] = useState(initialOptions)
  const [selectedOptions, setSelectedOptions] = useState([])

  useEffect(() => {
    const transformedOptions = transformOptions(initialOptions)
    setOptions(transformedOptions)

    if (defaultValues.length > 0) {
      const initiallySelected = transformedOptions.filter(option => defaultValues.includes(option.value))
      setSelectedOptions(initiallySelected)
    }
  }, [initialOptions, defaultValues])

  function handleChange(selected) {
    setSelectedOptions(selected)
    onChange(field, selected.map(obj => obj.value))
  }

  return (
    <Select
      inputId="indicators-clear"
      className="multi-select"
      classNamePrefix="react-select"
      closeMenuOnSelect={false}
      appearance="subtle"
      value={selectedOptions}
      isMulti
      options={options}
      placeholder={placeholder}
      onChange={handleChange}
    />
  )
}

Multiselect.propTypes = {
  field: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  initialOptions: PropTypes.arrayOf(PropTypes.object),
  defaultValues: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  placeholder: PropTypes.string
}

export default React.memo(Multiselect)

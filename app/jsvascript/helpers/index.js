import { capitalize, map } from 'lodash'

function titleize(string) {
  return map(string.split('_'), capitalize).join(' ')
}

function transformOptions(data) {
  return data.map(item => ({
    value: item.id,
    label: item.name
  }))
}

export { titleize, transformOptions }

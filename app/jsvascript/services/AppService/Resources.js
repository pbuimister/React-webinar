import Resource from './Resource'

class Resources extends Resource {
  queryString(params) {
    if (params.length === 0) {
      return ''
    }

    return `?${new URLSearchParams(params).toString()}`
  }

  collectionPath(action = null, params = '') {
    return `/${this.resource_name}${action ? `/${action}` : ''}${this.queryString(params)}`
  }

  resourcePath(id, action = null) {
    return `/${this.resource_name}/${id}${action ? `/${action}` : ''}`
  }

  collection(params = '', options = {}) {
    return this.request('get', this.collectionPath(null, params), options)
  }

  resource(id, options = {}) {
    return this.request('get', this.resourcePath(id), options)
  }

  create(body, options = {}) {
    return this.request('post', this.collectionPath(), {
      body: JSON.stringify(body),
      ...options,
    })
  }

  update(id, body, options = {}) {
    return this.request('put', this.resourcePath(id), {
      body: JSON.stringify(body),
      ...options,
    })
  }

  destroy(id, options = {}) {
    return this.request('destroy', this.resourcePath(id), options)
  }
}

export { Resource, Resources }

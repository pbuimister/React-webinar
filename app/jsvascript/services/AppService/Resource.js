import { FetchRequest } from '@rails/request.js'

class Resource {
  constructor(resource_name) {
    this.resource_name = resource_name
  }

  default_headers() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  }

  resourcePath(action = null) {
    return `/${this.resource_name}${action ? `/${action}` : ''}`
  }

  headers(headers = {}) {
    return Object.assign(this.default_headers(), headers)
  }

  reportError(msg) {
    console.error(msg)
  }

  async request(method, url, options = {}) {
    const { headers, ...otherOptions } = options

    const request = new FetchRequest(method, url, {
      headers: this.headers(headers),
      ...otherOptions
    })

    const response = await request.perform()

    if (!response.ok) {
      this.reportError(`Error fetching ${this.resource_name}. Response Status: ${response.statusCode}`)
      const error = await response.json

      if (response.statusCode === 403) {
        throw new Error(error.message || response.statusText)
      } else {
        return null
      }
    }

    return response.json
  }

  resource(options = {}) {
    return this.request('get', this.resourcePath(), options)
  }

  create(body, options = {}) {
    return this.request('post', this.resourcePath(), {
      body: JSON.stringify(body),
      ...options
    })
  }

  update(body, options = {}) {
    return this.request('put', this.resourcePath(), {
      body: JSON.stringify(body),
      ...options
    })
  }

  destroy(options = {}) {
    return this.request('destroy', this.resourcePath(), options)
  }
}

export default Resource

import { Resource, Resources } from './Resources'

const AppService = {
  jobs: new Resources('jobs'),
  users: new Resources('users')
}

export default AppService

const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const { Probot } = require('probot')
// Requiring our fixtures
const payload = require('./fixtures/pull_request.opened')

const deployment = {
  ref: 'hiimbex-patch-1',
  task: 'deploy',
  auto_merge: true,
  required_contexts: [],
  payload: {
    'schema': 'rocks!'
  },
  environment: 'production',
  description: 'My Probot App\'s first deploy!',
  transient_environment: false,
  production_environment: true
}

const deploymentStatus = {
  state: 'success',
  log_url: 'https://example.com',
  description: 'My Probot App set a deployment status!',
  environment_url: 'https://example.com',
  auto_inactive: true
}

nock.disableNetConnect()

describe('My Probot app', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    // Load our app into probot
    const app = probot.load(myProbotApp)

    // just return a test token
    app.app = () => 'test'
  })

  test('creates a deployment and a deployment status', async () => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a deployment is created
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/deployments', (body) => {
        expect(body).toMatchObject(deployment)
        return true
      })
      .reply(200, { id: 123 })

    // Test that a deployment status is created
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/deployments/123/statuses', (body) => {
        expect(body).toMatchObject(deploymentStatus)
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock

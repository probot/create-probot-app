const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const { Probot } = require('probot')
// Requiring our fixtures
const installationCreatedPayload = require('./fixtures/installation.created')

// Mocking out our use of random numbers
const mockMath = Object.create(global.Math)
mockMath.random = () => 1
global.Math = mockMath

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

  test('creates a pull request on installation', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/git/refs/heads/master')
      .reply(200, { object: { sha: 'abc123' } })

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/git/refs', {
        ref: 'refs/heads/new-branch-9999',
        sha: 'abc123'
      })
      .reply(200)

    nock('https://api.github.com')
      .put('/repos/hiimbex/testing-things/contents/path/to/your/file.md', {
        branch: 'new-branch-9999',
        message: 'adds config file',
        content: 'TXkgbmV3IGZpbGUgaXMgYXdlc29tZSE='
      })
      .reply(200)

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/pulls', {
        title: 'Adding my file!',
        head: 'new-branch-9999',
        base: 'master',
        body: 'Adds my new file!',
        maintainer_can_modify: true
      })
      .reply(200)

    // Recieve a webhook event
    await probot.receive({ name: 'installation', payload: installationCreatedPayload })
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock

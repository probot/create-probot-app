const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const { Probot } = require('probot')
// Requiring our fixtures
const checkSuitePayload = require('./fixtures/check_suite.requested')
const checkRunSuccess = require('./fixtures/check_run.created')
const fs = require('fs')
const path = require('path')

describe('My Probot app', () => {
  let probot
  let mockCert

  beforeAll((done) => {
    fs.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), (err, cert) => {
      if (err) return done(err)
      mockCert = cert
      done()
    })
  })

  beforeEach(() => {
    nock.disableNetConnect()
    probot = new Probot({ id: 123, cert: mockCert })
    // Load our app into probot
    probot.load(myProbotApp)
  })

  test('creates a passing check', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/check-runs', (body) => {
        body.started_at = '2018-10-05T17:35:21.594Z'
        body.completed_at = '2018-10-05T17:35:53.683Z'
        expect(body).toMatchObject(checkRunSuccess)
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'check_suite', payload: checkSuitePayload })
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock

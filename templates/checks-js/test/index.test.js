import nock from "nock";
// Requiring our app implementation
import myProbotApp from "../index.js";
import { Probot, ProbotOctokit } from "probot";
// Requiring our fixtures
//import checkSuitePayload from "./fixtures/check_suite.requested" with { type: "json" };
//import checkRunSuccess from "./fixtures/check_run.created" with { type: "json" };
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { describe, beforeEach, afterEach, test } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const privateKey = fs.readFileSync(
  path.join(__dirname, "fixtures/mock-cert.pem"),
  "utf-8",
);

const checkSuitePayload = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "fixtures/check_suite.requested.json"),
    "utf-8",
  ),
);

const checkRunSuccess = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "fixtures/check_run.created.json"),
    "utf-8",
  ),
);

describe("My Probot app", () => {
  let probot;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey,
      // disable request throttling and retries for testing
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    // Load our app into probot
    probot.load(myProbotApp);
  });

  test("creates a passing check", async () => {
    const mock = nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, {
        token: "test",
        permissions: {
          checks: "write",
        },
      })

      .post("/repos/hiimbex/testing-things/check-runs", (body) => {
        body.started_at = "2018-10-05T17:35:21.594Z";
        body.completed_at = "2018-10-05T17:35:53.683Z";
        assert.deepStrictEqual(body, checkRunSuccess);
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: "check_suite", payload: checkSuitePayload });

    assert.deepStrictEqual(mock.pendingMocks(), []);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock

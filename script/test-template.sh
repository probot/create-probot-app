#!/usr/bin/env bash
set -Ee # Exit immediately if a command returns a non-zero status
set -u  # Exit when references variables are undefined
set -o pipefail  # Exit when any program execution in a pipeline breaks

readonly APP="./bin/create-probot-app.js"
readonly TEMPLATE=$1
readonly TEST_FOLDER="./tmp-test/${TEMPLATE}"
readonly LOGFILENAME="test.output"
readonly LOGFILE="${TEST_FOLDER}/${LOGFILENAME}"

function create_app() {
  mkdir -p "$TEST_FOLDER"
  "$APP" \
    --appName "template-test-app" \
    --desc "A Probot App for building on Travis" \
    --author "Pro Báwt" \
    --email "probot@example.com" \
    --user "probot" \
    --template "$TEMPLATE" \
    --repo "create-probot-app-${TEMPLATE}" \
    "$TEST_FOLDER"
}

function run_npm_tests() {
    echo; echo "--[test ${TEMPLATE}]-- Run npm tests... "
    cd "$TEST_FOLDER"
    npm test 2>&1 | tee "$LOGFILENAME"
    cd - > /dev/null
}

function check_errors_in_log() {
    echo; echo -n "--[test ${TEMPLATE}]-- Search for errors in logs output... "
    if ! [ -f ${LOGFILE} ]; then echo "ERROR Log file ${LOGFILE} not found"; exit 1; fi
    local ERRORS=$(grep \
        --extended-regexp \
        --regexp='(WARN|Warn|warn)' \
        --regexp='(ERR|Err|error)' \
        --count \
        ${LOGFILE})
    if [ "$ERRORS" -gt 0 ]; then echo "found ${ERRORS} error, aborting"; exit 1; fi
    echo "ok"; echo
}

echo "--[test ${TEMPLATE}]-- Run tests in ${TEST_FOLDER} folder"
create_app
run_npm_tests
check_errors_in_log
echo "--[test ${TEMPLATE}]-- All tests completed successfully!"

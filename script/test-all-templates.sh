#!/usr/bin/env bash
set -e

for template in $(./bin/create-probot-app.js --show-templates ALL); do
    npm run test:template $template;
done

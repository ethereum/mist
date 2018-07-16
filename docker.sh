#!/bin/bash
docker run --rm \
  --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS|APPVEYOR_|CSC_|_TOKEN|_KEY|AWS_|STRIP|BUILD_') \
  -v ${PWD}:/project \
  mist-electron:latest \
  /bin/bash -c "echo $HOME; yarn --link-duplicates --pure-lockfile && yarn gulp --win"


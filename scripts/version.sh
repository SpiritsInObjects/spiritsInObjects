#!/bin/bash

npm version --no-git-tag-version ${1}

#version all sub projects and config files
version=$(jq -r  '.version' ./package.json)

npm i

echo "VERSION: $version"
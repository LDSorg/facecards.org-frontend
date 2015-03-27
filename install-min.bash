#!/bin/bash
set -e
set -u

#curl -fsSL https://bit.ly/install-facecards-dev | bash

echo "Cloning Frontend-Developer NoBackend (https static file server)..."
git clone https://github.com/LDSorg/backend-oauth2-node-passport-example.git ./facecards.org-nobackend \
  > /dev/null 2> /dev/null
pushd ./facecards.org-nobackend > /dev/null

echo "Installing ExpressJS Static File Server... (this will take several seconds)"
npm install --silent > /dev/null

echo "Cloning Developer HTTPS Certificates for https://local.ldsconnect.org:8043..."
git clone https://github.com/LDSorg/local.ldsconnect.org-certificates.git ./certs \
  > /dev/null 2> /dev/null

echo "Cloning the facecards.org-frontend and creating ./public link"
git clone https://github.com/LDSorg/facecards.org-frontend.git ./frontend \
  > /dev/null 2> /dev/null
ln -s ./frontend/app public > /dev/null

echo "Installing Bower Components... (this will take several seconds, maybe a minute)"
pushd ./frontend > /dev/null
bower install --silent > /dev/null
#jade app/**/*.jade

echo ""
echo ""
echo "###############################################"
echo "#                                             #"
echo "#   READY! Here's what you need to do next:   #"
echo "#                                             #"
echo "###############################################"
echo ""

#echo "Open up a new tab and watch the jade files like so:"
#echo ""
#echo "    pushd $(pwd)"
#echo "    jade -w ./public/views/*.jade"
#echo ""
#echo ""

echo "Open up yet another new tab and run the server like so:"
echo ""
echo "    pushd" "$(pwd)"
echo "    node ./serve.js"
echo ""
echo ""

echo "Open up your web browser and fire it up to the project:"
echo ""
echo "    https://local.ldsconnect.org:8043"
echo ""
echo ""

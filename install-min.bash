#!/bin/bash

#curl -fsSL https://bit.ly/install-facecards-dev | bash

git clone https://github.com/LDSorg/backend-oauth2-node-passport-example.git facecards.org-nobackend
pushd facecards.org-nobackend

git clone https://github.com/LDSorg/facecards.org-frontend.git frontend
ln -s frontend/app public
pushd frontend
bower install

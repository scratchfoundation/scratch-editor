if [ -z "$BEFORE_DEPLOY_RAN" ]; then
  VPKG=$($(npm bin)/json -f package.json version)
  VERSION=${VPKG}-prerelease.${RELEASE_TIMESTAMP}
  echo "export RELEASE_VERSION=${VERSION}" >> $BASH_ENV
  npm --no-git-tag-version version $VERSION
  if [[ "$CIRCLE_BRANCH" == hotfix/* ]]; then # double brackets are important for matching the wildcard
    echo "export NPM_TAG=hotfix" >> $BASH_ENV
  fi
  git config --global user.email "$(git log --pretty=format:"%ae" -n1)"
  git config --global user.name "$(git log --pretty=format:"%an" -n1)"
  echo "export BEFORE_DEPLOY_RAN=true" >> $BASH_ENV
fi

DEST_BRANCHES="
    develop,250 \
    scratch-android,250 \
    scratch-desktop,250 \
    main,250 \
    gh-pages,1 \
"

BUILD_OUT="./monorepo.out"

# set organization to where you have forked the repository
GITHUB_ORG=""
BASE_REPO="scratch-editor"

# https://gist.github.com/spenserhale/19a2abd03c0558449202a1d7bcc64ed7
batch_push_branch () {
    REMOTE=origin
    BRANCH="$1"
    BATCH_SIZE=$2

    git -C "$BUILD_OUT" checkout "$BRANCH"

    # check if the branch exists on the remote
    if git -C "$BUILD_OUT" show-ref --quiet --verify refs/remotes/$REMOTE/$BRANCH; then
        # if so, only push the commits that are not on the remote already
        range=$REMOTE/$BRANCH..HEAD
    else
        # else push all the commits
        range=HEAD
    fi
    # count the number of commits to push
    n=$(git -C "$BUILD_OUT" log --first-parent --format=format:x $range | wc -l)

    # push each batch
    for i in $(seq $n -$BATCH_SIZE 1); do
        # get the hash of the commit to push
        h=$(git -C "$BUILD_OUT" log --first-parent --reverse --format=format:%H --skip $i -n1)
        echo "Pushing $h..."
        git -C "$BUILD_OUT" push $REMOTE ${h}:refs/heads/$BRANCH
    done
    # push the final partial batch
    git -C "$BUILD_OUT" push $REMOTE HEAD:refs/heads/$BRANCH
}

git -C "$BUILD_OUT" remote set-url origin "git@github.com:${GITHUB_ORG}/${BASE_REPO}.git"

for BRANCH_DATA in $DEST_BRANCHES; do
    IFS=, read -r BRANCH_NAME BATCH_SIZE <<< "$BRANCH_DATA"

    batch_push_branch "$BRANCH_NAME" $BATCH_SIZE
done

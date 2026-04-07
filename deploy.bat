@echo off
echo Setting up local repository...

:: You MUST use git for local tracking. There is no gh equivalent for this.
git init
git checkout --orphan master 2>NUL
git add -A
git commit -m "Clean slate"

echo Creating repo on GitHub and pushing...
:: gh handles creating the remote repo and pushes your local git commits
gh repo create dg8abyt-oss/tracker --public --source=. --remote=origin --push 2>NUL || (
    echo Repo already exists on GitHub. Forcing push...
    git push -u --force origin master
)

echo Deployment complete!
pause

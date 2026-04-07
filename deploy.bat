@echo off
echo Initializing clean slate deployment using GitHub CLI...

:: Initialize local git repo
git init

:: Stage and commit files locally (git is required for local history)
git checkout --orphan temp_branch
git add -A
git commit -m "Clean slate"
git branch -M master

:: Use gh CLI to create the repo on GitHub and push immediately
:: If the repo already exists, it falls back to a standard force push
gh repo create dg8abyt-oss/tracker --public --source=. --remote=origin --push 2>NUL || (
    echo Repository already exists on GitHub. Forcing clean slate push...
    git remote remove origin 2>NUL
    git remote add origin https://github.com/dg8abyt-oss/tracker.git
    git push -u --force origin master
)

echo Deployment complete!
pause

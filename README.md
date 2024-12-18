# Static Intro Page

## Role setup

https://github.com/GreenerSoftware/IntroPage/issues/4

## Web template

https://startbootstrap.com/template/modern-business

## Architecture

Summary AWS architecture: https://docs.google.com/drawings/d/1_9FC5a_eQK-jCIXJWbQ7FaTh-Sgw7-Zm44ocpHQFwqU

Generated from: https://github.com/davidcarboni/template

## Infrastructure build inputs

Create the following files under `.infrastructure/secrets/`

 ### `aws.sh`

export AWS_PROFILE=alwayson

### `github.sh`

export PERSONAL_ACCESS_TOKEN=ghp_xxxx (Personal Accees Token with `repo` scope)
export OWNER=GreenerSoftware
export REPO=intropage

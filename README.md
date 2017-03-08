# cms-audio-lambda

[![Build Status](https://snap-ci.com/PRX/cms-audio-lambda/branch/master/build_image)](https://snap-ci.com/PRX/cms-audio-lambda/branch/master)
[![codecov](https://codecov.io/gh/PRX/cms-audio-lambda/branch/master/graph/badge.svg)](https://codecov.io/gh/PRX/cms-audio-lambda)

## Description

Lambda worker to process/validate for [cms.prx.org](https://github.com/PRX/cms.prx.org) audio-file uploads.

Triggered via SNS notifications (see [Announce](https://github.com/PRX/announce)), the lambda will:

#### On `create` or `update`

1. Download the `upload_path` for the audio file object (from S3 or just HTTP)
2. Run `ffprobe` against the file to verify it's an mp3 and gather other metadata
3. Copy the original audio file to a destination S3 bucket/path (`public/audio_files/1234/filename.mp3`)
4. Make an additional copy for the "broadcast" version CMS wants to use (`public/audio_files/1234/filename_broadcast.mp3`)
5. Send success/failure/invalid messages back to CMS via SQS ([Shoryuken](https://github.com/phstc/shoryuken)), including some additional identify data about the audio length/type/etc.

#### On `delete`

1. TODO: since audio-files are only soft-deleted by CMS, not sure this would ever happen.

## Developing

Make sure you have AWS credentials locally (usually in `~/.aws/credentials`) that are able to access
the `TEST_BUCKET` and `DESTINATION_BUCKET` defined in `config/test.env`.  Then, just...

```
npm install
npm test # or npm run watch
```

## Deploying

Deployment to AWS is handled by [node-lambda](https://www.npmjs.com/package/node-lambda),
with some hacks! No native bindings are used (we bundle a prebuilt 64bit ffmpeg binary),
so you can build/deploy this function from anywhere.

To create a new Lambda function, you should `cp env-example .env`. Then manually
deploy it using `./node_modules/node-lambda deploy -e [development|staging|production]`.
This will create/overwrite any configuration changes you've made to the lambda, so you
only want to use this for initial setup.

To update an existing Lambda function, use the "deploy-ENV" scripts in `package.json`.
No `.env` is required, as the non-secret configs are in the `/config` folder.

```
npm run deploy-dev
npm run deploy-staging
npm run deploy-prod
```

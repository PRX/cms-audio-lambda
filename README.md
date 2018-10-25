# CMS Audio Lamda

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

1. Since audio-files are only soft-deleted by CMS, this lambda doesn't actually
   do anything with them.  So this is a TODO!

### Callbacks

SQS callbacks contain the following JSON data:

| Key  | Sub-key    | Description |
| ---- | ---------- | ----------- |
| id   |            | ID of the AudioFile that triggered this job
| path |            | Destination path in S3 the file was copied to
| name |            | File name
| mime |            | Mime-type of the file
| size |            | Size of the file in bytes
| audio |           | Detected audio stream metadata (or undefined)
|       | duration  | Duration in ms
|       | format    | Detected codec string ('mp2' / 'mp3')
|       | bitrate   | Audio bitrate (96000 / 128000)
|       | frequency | Audio frequency hz (44100 / 48000)
|       | channels  | Number of channels (1 / 2 / 4)
|       | layout    | Channel layout string ('mono' / 'stereo')
| video |           | Detected video stream metadata (or undefined)
|       | duration  | Duration in ms
|       | format    | Detected codec string ('h264' / 'theora' / 'flv1')
|       | bitrate   | Video bitrate
|       | width     | Video width in pixels
|       | height    | Video height in pixels
|       | aspect    | Aspect ratio string ('1:1' / '0:1')
|       | framerate | Frame rate string ('30:1')
| downloaded |      | Boolean if the audio download succeeded
| valid      |      | Boolean if ffprobe recognized any audio/video streams
| processed  |      | Boolean if uploading to S3 destination succeeded
| error      |      | String if any error occurred in the above 3 states

# Installation

To get started, first run an `yarn install`.  Or if you're using Docker, then
`docker-compose build`.

## Tests

You do need a writeable S3 bucket and SQS to run the full test suite. The test/dev
values for these are already set in the `env-example`, so you really just need
some local AWS credentials (usually in `~/.aws/credentials`) that are able to
access these resources.

```
cp env-example .env
yarn
yarn test
yarn run watch
```

Another option is to use Docker (in which case you'll have to provide some AWS
credentials to the docker container itself, via ENV variables):

```
cp env-example .env
echo AWS_ACCESS_KEY_ID=some-access-key >> .env
echo AWS_SECRET_ACCESS_KEY=some-secret >> .env
echo AWS_DEFAULT_REGION=us-east-1 >> .env

docker-compose build
docker-compose run test
```

## Deploying

Deploying is handled by the PRX [Infrastructure](https://github.com/PRX/Infrastructure) repo,
using CloudFormation.  Internally, this will run the `yarn run build` command to
zip the lambda code and upload it to S3.

# License

[MIT License](http://opensource.org/licenses/MIT)

FROM lambci/lambda:build-nodejs8.10

MAINTAINER PRX <sysadmin@prx.org>
LABEL org.prx.lambda="true"

WORKDIR /app

ENTRYPOINT [ "yarn", "run" ]
CMD [ "test" ]

ADD yarn.lock ./
ADD package.json ./
RUN npm install --quiet --global yarn && yarn install
ADD . .
RUN ./bin/get-ffmpeg
RUN ./bin/get-mpck
RUN yarn run build

ENV FFMPEG_PATH bin/ffmpeg
ENV FFPROBE_PATH bin/ffprobe
ENV MPCK_PATH bin/mpck

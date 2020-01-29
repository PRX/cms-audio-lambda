FROM lambci/lambda:build-nodejs10.x

MAINTAINER PRX <sysadmin@prx.org>
LABEL org.prx.lambda="true"

WORKDIR /app

ENTRYPOINT [ "yarn", "run" ]
CMD [ "test" ]

RUN yum install -y rsync && yum clean all && rm -rf /var/cache/yum
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

FROM electronuserland/builder:wine

RUN apt-get update && apt-get install nsis -y
#
# Per Meteor requirements, we shouldn't run meteor from root user.
# Here we create an user along with its home directory.
# https://github.com/meteor/meteor/issues/7939
# https://github.com/meteor/meteor/issues/7959
# 
RUN useradd mistuser
RUN mkdir -p /home/mistuser
RUN chown -R mistuser /home/mistuser
RUN chown -R mistuser /project
USER mistuser

ENV PATH="${PATH}:/home/mistuser/.meteor"
RUN curl https://install.meteor.com/?version=1.6.1 | /bin/sh
RUN which meteor

# electron-builder flag
ENV USE_HARD_LINKS="true"

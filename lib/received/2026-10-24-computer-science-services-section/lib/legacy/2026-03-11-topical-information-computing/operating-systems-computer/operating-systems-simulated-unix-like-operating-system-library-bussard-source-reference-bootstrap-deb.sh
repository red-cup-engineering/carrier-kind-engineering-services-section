#!/bin/bash

# This script is used in CI but could also be helpful for getting your own
# dev machine set up.
export TERM=dumb
apt-get update -qq && apt-get install -qq cloc make wget luajit lua-check libfuse2

# In CI we use an image which has love already, because the debs below segfault
# when run in docker for some reason.
if [ "$(which love 2> /dev/null)" = "" ]; then
    wget "https://bitbucket.org/rude/love/downloads/love-11.3-x86_64.AppImage"
    chmod 755 love-11.3-x86_64.AppImage
    mv love-11.3-x86_64.AppImage /usr/local/bin/love
fi

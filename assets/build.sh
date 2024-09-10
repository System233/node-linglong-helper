#!/bin/bash

function run() {
    [ -e "$1" ] && $1
}

mkdir -p $(dirname $LINGLONG_COMMAND)
echo '#!/bin/bash' >$LINGLONG_COMMAND

run "./install_dep.sh"
run "./install_patch.sh"
run "./install_start.sh"

#!/bin/bash

function run() {
    [ -e "$1" ] && $1
}

run "./install_dep.sh"
run "./install_patch.sh"
run "./install_start.sh"

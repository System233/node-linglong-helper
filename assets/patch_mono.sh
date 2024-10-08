#!/bin/bash
# generated by ll-helper

echo Applying Patch: mono

MONO_PATH=$(find $PREFIX -name "*.dll" | xargs dirname | sort | uniq | paste -sd :)
if [ -n "$MONO_PATH" ]; then
    echo Patch Mono Environment
    echo "export MONO_PATH=\$MONO_PATH:$MONO_PATH" | tee -a $LINGLONG_COMMAND
fi

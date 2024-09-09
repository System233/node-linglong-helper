#!/bin/bash

for i in `find "./linglong/sources" -name "*.deb"`;do
    dpkg -x "$i" $PREFIX
done

# /opt/apps/APP_ID/files => $PREFIX
# /opt/apps/APP_ID/entries => $PREFIX/share
# /usr => $PREFIX


function merge(){
    SRC=$1
    DEST=$2
    for file in `find "$SRC" -printf "%P\n"`;do
        FROM=$SRC/$file
        TO=$DEST/$file
        if [ -d "$FROM" ];then
            mkdir -p "$TO"
        elif [ -L "$TO" ];then
            echo RM $TO
            rm "$TO"
        else
            mv "$FROM" "$TO"
        fi
    done
    rm -rf "$SRC"
}

merge $PREFIX/opt/apps/*/files $PREFIX
merge $PREFIX/opt/apps/*/entries $PREFIX/share
merge $PREFIX/usr $PREFIX
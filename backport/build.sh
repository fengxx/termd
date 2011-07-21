#!/bin/sh
#export PATH=YOUR_CROSS_COMPILE/bin:$PATH
if [ "$1" == "arm" ];then
    make ARCH=arm    CROSS_COMPILE=armv5l- CFLAGS=-static
else
    make ARCH=i386   CROSS_COMPILE=i686- CFLAGS=-static
fi
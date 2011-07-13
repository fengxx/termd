#!/usr/bin/perl
binmode STDOUT;
while(<>){
s/\s+//g;
#remove <Buffer> from  <Buffer dd dd >
s/\<Buffer(.*)\>/$1/;
print pack "H*", $_;
}
#include <stdio.h>
#include <stdlib.h> 
#include <signal.h>
#include <errno.h>
#include <termios.h>
#include <sys/ioctl.h>
#include <unistd.h>
#include <sys/time.h>
#include <sys/ioctl.h> 
#include <string.h> 
#include <fcntl.h> 
#include <termios.h>

int main(int argc, char *argv[])
{
  int i, args;
  pid_t pid;
  char *console="/dev/console";
  int c,width,height;
  while ((c = getopt(argc, argv, "w:h:")) != EOF) {
        switch (c) {
        case 'w':        /* width */
                width = atoi(optarg);
                break;
        case 'h':        /* height */
                height = atoi(optarg);
                break;
        }
  }
  pid = vfork();
  if (pid) {
    while (pid!=wait(&i));
    sync();
  }
  setsid();
  for (i=0; i<3; i++) {
    close(i);
    if(-1==open(console, O_RDWR)) {
      fprintf(stderr, "Can't open '%s'\n", console);
      exit(1);
    }
  }
  if (execvp(argv[optind], &argv[optind]) < 0) {
        perror("exec()"); /* Since exec* never return */ 
  }
  _exit(127);
}
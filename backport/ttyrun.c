/**
Most of Code took from the book <Advanced Programming in the UNIX Environment> 
see also: http://www.apuebook.com
*/
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
#define BUFFSIZE    512
#define GETPTY_BUFSIZE  16

typedef	void	Sigfunc(int);	/* for signal handlers */

static volatile sig_atomic_t sigcaught; /* set by signal handler */
/*
 * The child sends us SIGTERM when it gets EOF on the pty slave or
 * when read() fails.  We probably interrupted the read() of ptym.
 */
static void
sig_term(int signo)
{
    sigcaught = 1;      /* just set flag and return */
}

int fork_tty (int *amaster, 
               const struct winsize *winp) 
{ 
    pid_t pid; 
    int master_fd=-1;
    master_fd = open("/dev/console", O_RDWR|O_NOCTTY);
    pid = fork(); 
  switch (pid) 
    { 
    case -1: /* Error */ 
        perror("can't fork pty");
      return -1; 
    case 0: /* Child */   
      dup2 (master_fd, STDIN_FILENO); 
      dup2 (master_fd, STDOUT_FILENO); 
      dup2 (master_fd, STDERR_FILENO); 
      return 0; 
    default: /* Parent */ 
      close (master_fd); 
      return pid; 
   }
  return -1; 
}

Sigfunc * signal_intr(int signo, Sigfunc *func)
{
	struct sigaction	act, oact;

	act.sa_handler = func;
	sigemptyset(&act.sa_mask);
	act.sa_flags = 0;
#ifdef	SA_INTERRUPT
	act.sa_flags |= SA_INTERRUPT;
#endif
	if (sigaction(signo, &act, &oact) < 0)
		return(SIG_ERR);
	return(oact.sa_handler);
}

ssize_t             /* Write "n" bytes to a descriptor  */
writen(int fd, const void *ptr, size_t n)
{
	size_t		nleft;
	ssize_t		nwritten;

	nleft = n;
	while (nleft > 0) {
		if ((nwritten = write(fd, ptr, nleft)) < 0) {
			if (nleft == n)
				return(-1); /* error, return -1 */
			else
				break;      /* error, return amount written so far */
		} else if (nwritten == 0) {
			break;
		}
		nleft -= nwritten;
		ptr   += nwritten;
	}
	return(n - nleft);      /* return >= 0 */
}

void loop_io(int ptym, int ignoreeof)
{
    pid_t   child;
    int     nread;
    char    buf[BUFFSIZE];
    if ((child = fork()) < 0) {
        perror("fork error");
    } else if (child == 0) {    /* child copies stdin to ptym */
        for ( ; ; ) {
            if ((nread = read(STDIN_FILENO, buf, BUFFSIZE)) < 0)
                perror("read error from stdin");
            else if (nread == 0)
                break;      /* EOF on stdin means we're done */
            if (writen(ptym, buf, nread) != nread)
                perror("writen error to master pty");
        }

        /*
         * We always terminate when we encounter an EOF on stdin,
         * but we notify the parent only if ignoreeof is 0.
         */
        if (ignoreeof == 0)
            kill(getppid(), SIGTERM);   /* notify parent */
        exit(0);    /* and terminate; child can't return */
    }

    /*
     * Parent copies ptym to stdout.
     */
    if (signal_intr(SIGTERM, sig_term) == SIG_ERR)
        perror("signal_intr error for SIGTERM");

    for ( ; ; ) {
        if ((nread = read(ptym, buf, BUFFSIZE)) <= 0)
            break;      /* signal caught, error, or EOF */  
        if (writen(STDOUT_FILENO, buf, nread) != nread)
            perror("writen error to stdout");
    }

    /*
     * There are three ways to get here: sig_term() below caught the
     * SIGTERM from the child, we read an EOF on the pty master (which
     * means we have to signal the child to stop), or an error.
     */
    if (sigcaught == 0) /* tell child if it didn't send us the signal */
        kill(child, SIGTERM);
    /*
     * Parent returns to caller.
     */
}

static void
set_noecho(int fd)     /* turn off echo (for slave pty) */
{
    struct termios stermios;

    if (tcgetattr(fd, &stermios) < 0)
        perror("tcgetattr error");

    stermios.c_lflag &= ~(ECHO | ECHOE | ECHOK | ECHONL);

    /*
     * Also turn off NL to CR/NL mapping on output.
     */
    stermios.c_oflag &= ~(ONLCR);

    if (tcsetattr(fd, TCSANOW, &stermios) < 0)
        perror("tcsetattr error");
}


int main(int argc, char *argv[]){
    int fdm;
    pid_t pid;
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
    //printf("w*h %d, %d", width,height);
    if(width==0) width=80;
    if(height==0) height=24;
    struct winsize ws;
      ws.ws_row = height;
      ws.ws_col = width;
      ws.ws_xpixel = 0;
      ws.ws_ypixel = 0;    
     pid=fork_tty(&fdm,&ws);/* This can be a struct winsize pointer used... */ 
    //set window size
    switch (pid) 
    { /* ...to set the screen size of the terminal */ 
    case -1: /* Error */ 
      perror ("fork() in main"); 
      exit (EXIT_FAILURE); 
    case 0: /* This is the child process */ 
      //set_noecho(STDIN_FILENO);   /* stdin is slave pty */
      setsid();
      if (execvp(argv[optind], &argv[optind]) < 0) {
        perror("exec()"); /* Since exec* never return */ 
      }
      exit (EXIT_FAILURE); 
    default: /* This is the parent process */ 
      loop_io(fdm,1);
  }
}

/* This code is PUBLIC DOMAIN, and is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the accompanying 
 * LICENSE file.
 */

#include <v8.h>
#include <node.h>
#include <stdio.h>
#include <errno.h>
#include <fcntl.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <termios.h>
#include <sys/ioctl.h>
#include <sys/un.h>
#include <ev.h>
#include "ptyext.h"
extern char **environ;

namespace node {
  using namespace v8;
  static Persistent<String> pid_symbol;
  static Persistent<String> onexit_symbol;
  static Persistent<FunctionTemplate> s_ct;
  static inline int ResetFlags(int fd) {
  int flags = fcntl(fd, F_GETFL, 0);
  // blocking
  int r = fcntl(fd, F_SETFL, flags & ~O_NONBLOCK);
  flags = fcntl(fd, F_GETFD, 0);
  // unset the CLOEXEC
  fcntl(fd, F_SETFD, flags & ~FD_CLOEXEC);
  return r;
}
  void PseudoTerminal::Init(Handle<Object> target)
  {
    HandleScope scope;

    Local<FunctionTemplate> t = FunctionTemplate::New(New);

    s_ct = Persistent<FunctionTemplate>::New(t);
    s_ct->InstanceTemplate()->SetInternalFieldCount(1);
    s_ct->SetClassName(String::NewSymbol("PseudoTerminal"));
    pid_symbol = NODE_PSYMBOL("pid");
    onexit_symbol = NODE_PSYMBOL("onexit");
    NODE_SET_PROTOTYPE_METHOD(s_ct, "openpty", PseudoTerminal::Openpty);
    NODE_SET_PROTOTYPE_METHOD(s_ct, "spawn", PseudoTerminal::Spawn);
    NODE_SET_PROTOTYPE_METHOD(s_ct, "kill", PseudoTerminal::Kill);
    NODE_SET_PROTOTYPE_METHOD(s_ct, "setWindowSize", PseudoTerminal::SetWindowSize);
    target->Set(String::NewSymbol("PseudoTerminal"),
                s_ct->GetFunction());
  }

Handle<Value> PseudoTerminal::New(const Arguments& args)
  {
    HandleScope scope;
    PseudoTerminal* hw = new PseudoTerminal();
    hw->Wrap(args.This());
    return args.This();
  }
  
//copy from node source code
//file, args, fds
Handle<Value> PseudoTerminal::Spawn(const Arguments& args) {
    HandleScope scope;
    PseudoTerminal *child = PseudoTerminal::Unwrap<PseudoTerminal>(args.Holder());
    //parameter cast
    String::Utf8Value file(args[0]->ToString());
      // Copy second argument args[1] into a c-string array called argv.
      // The array must be null terminated, and the first element must be
      // the name of the executable -- hence the complication.
      Local<Array> argv_handle = Local<Array>::Cast(args[1]);
      int argc = argv_handle->Length();
      int argv_length = argc + 1 + 1;
      char **argv = new char*[argv_length]; // heap allocated to detect errors
      argv[0] = strdup(*file); // + 1 for file
      argv[argv_length-1] = NULL;  // + 1 for NULL;
      int i;
      for (i = 0; i < argc; i++) {
        String::Utf8Value arg(argv_handle->Get(Integer::New(i))->ToString());
        argv[i+1] = strdup(*arg);
      }
      int fds=args[2]->Int32Value();
      //fork  
      int r =child->Spawn(argv[0],argv,fds);
      for (i = 0; i < argv_length; i++) free(argv[i]);
      delete [] argv;
      Local<Array> a = Array::New(1);
      a->Set(0, Integer::New(r));
      return scope.Close(a);
}

int PseudoTerminal::Spawn(const char *file,
                        char *const args[],int fds){
  assert(pid_ == -1);
  assert(!ev_is_active(&child_watcher_));                        
      char **save_our_env = environ;    
    switch (pid_ = fork()) {
        case -1:  // Error.
            Stop();
            return -4;
        case 0:  // Child
            setsid(); //it is very important to avoid "no job control error"
            ResetFlags(fds);
            dup2(fds, STDIN_FILENO);
            dup2(fds, STDOUT_FILENO);
            dup2(fds, STDERR_FILENO);
            //cwd?? chdir(cwd)
            execvp(file, args);
            _exit(127);
  }
  // Parent.    
  // Restore environment.
  environ = save_our_env;
  ev_child_set(&child_watcher_, pid_, 0);
  ev_child_start(EV_DEFAULT_UC_ &child_watcher_);
  Ref();
  handle_->Set(pid_symbol, Integer::New(pid_)); 
  return 0;  
}

Handle<Value> PseudoTerminal::Kill(const Arguments& args) {
  HandleScope scope;
  PseudoTerminal *child = ObjectWrap::Unwrap<PseudoTerminal>(args.Holder());
  assert(child);
  if (child->pid_ < 1) {
    // nothing to do
    return False();
  }
  int sig = SIGTERM;

  if (args.Length() > 0) {
    if (args[0]->IsNumber()) {
      sig = args[0]->Int32Value();
    } else {
      return ThrowException(Exception::TypeError(String::New("Bad argument.")));
    }
  }
  if (child->Kill(sig) != 0) {
    return ThrowException(ErrnoException(errno, "Kill"));
  }
  return True();
}


Handle<Value> PseudoTerminal::Openpty(const Arguments& args)
  {
    HandleScope scope;
    typedef void (*sighandler)(int);
    int master_fd=-1, slave_fd=-1;
    /* openpty(&master_fd, &slave_fd, NULL, NULL, NULL);
    will fail in node v0.2.3 (in dlopen call) even with -rdynamic option.
    try use posix call
    */
    master_fd = posix_openpt(O_RDWR); 
    //master_fd = open("/dev/ptmx", O_RDWR);
    sighandler sig_saved = signal(SIGCHLD, SIG_DFL);
    grantpt(master_fd);
    unlockpt(master_fd);
    signal(SIGCHLD, sig_saved);
    char *slave_name = ptsname(master_fd);
    slave_fd = open(slave_name, O_RDWR|O_NOCTTY);
    //ioctl(slave_fd, I_PUSH, "ptem");
    //ioctl(slave_fd, I_PUSH, "ldterm");
    //ioctl(slave_fd, I_PUSH, "ttcompat");
  //int r = openpty(&master_fd, &slave_fd, NULL, NULL, NULL);
    Local<Array> a = Array::New(2);
    a->Set(0, Integer::New(master_fd));
    a->Set(1, Integer::New(slave_fd));
    return scope.Close(a);
  }

// process.binding('stdio').setWindowSize(fd, row, col);
Handle<Value> PseudoTerminal::SetWindowSize (const Arguments& args) {
  HandleScope scope;

  int fd = args[0]->IntegerValue();
  int row = args[1]->IntegerValue();
  int col = args[2]->IntegerValue();

  struct winsize ws;

  ws.ws_row = row;
  ws.ws_col = col;
  ws.ws_xpixel = 0;
  ws.ws_ypixel = 0;

  if (ioctl(fd, TIOCSWINSZ, &ws) < 0) {
    return ThrowException(ErrnoException(errno, "ioctl"));
  }

  return True();
}
  

void PseudoTerminal::OnExit(int status) {
  HandleScope scope;
  pid_ = -1;
  Stop();

  handle_->Set(pid_symbol, Null());

  Local<Value> onexit_v = handle_->Get(onexit_symbol);
  assert(onexit_v->IsFunction());
  Local<Function> onexit = Local<Function>::Cast(onexit_v);

  TryCatch try_catch;

  Local<Value> argv[2];
  if (WIFEXITED(status)) {
    argv[0] = Integer::New(WEXITSTATUS(status));
  } else {
    argv[0] = Local<Value>::New(Null());
  }

  if (WIFSIGNALED(status)) {
    argv[1] = String::NewSymbol(signo_string(WTERMSIG(status)));
  } else {
    argv[1] = Local<Value>::New(Null());
  }

  onexit->Call(handle_, 2, argv);

  if (try_catch.HasCaught()) {
    FatalException(try_catch);
  }
}

int PseudoTerminal::Kill(int sig) {
  if (pid_ < 1) return -1;
  return kill(pid_, sig);
}

//stops
void PseudoTerminal::Stop() {
  if (ev_is_active(&child_watcher_)) {
    ev_child_stop(EV_DEFAULT_UC_ &child_watcher_);
    Unref();
  }
  // Don't kill the PID here. We want to allow for killing the parent
  // process and reparenting to initd. This is perhaps not going the best
  // technique for daemonizing, but I don't want to rule it out.
  pid_ = -1;
 // _exit(1);
}
};

NODE_MODULE(ptyext, node::PseudoTerminal::Init);
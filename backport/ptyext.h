#include <node.h>
#include <node_object_wrap.h>
#include <v8.h>
#include <ev.h>

// PseudoTerminal is a thin wrapper around ev_child. It has the extra
// functionality that it can spawn a child process with pipes connected to
// its stdin, stdout, stderr. This class is not meant to be exposed to but
// wrapped up in a more friendly EventEmitter with streams for each of the
// pipes.
//
// When the child process exits (when the parent receives SIGCHLD) the
// callback child.onexit will be called.

namespace node {

class PseudoTerminal : ObjectWrap {
 public:
  static void Init(v8::Handle<v8::Object> target);

 protected:
  static v8::Handle<v8::Value> Openpty(const v8::Arguments& args);
  static v8::Handle<v8::Value> New(const v8::Arguments& args);
  static v8::Handle<v8::Value> Spawn(const v8::Arguments& args);
  static v8::Handle<v8::Value> Kill(const v8::Arguments& args);
  static v8::Handle<v8::Value> SetWindowSize(const v8::Arguments& args);

  PseudoTerminal() : ObjectWrap() {
    ev_init(&child_watcher_, PseudoTerminal::on_chld);
    child_watcher_.data = this;
    pid_ = -1;
  }

  ~PseudoTerminal() {
    Stop();
  }
  //Returns 0 on success.
    int Spawn(const char *file,
                            char *const args[],int fds);
 private:
  void OnExit(int code);

// Shouldn't this just move to node_child_process.cc?
  void Stop(void);
  int Kill(int sig);

  static void on_chld(EV_P_ ev_child *watcher, int revents) {
    PseudoTerminal *child = static_cast<PseudoTerminal*>(watcher->data);
    assert(revents == EV_CHILD);
    assert(child->pid_ == watcher->rpid);
    assert(&child->child_watcher_ == watcher);
    child->OnExit(watcher->rstatus);
  }
  ev_child child_watcher_;
  pid_t pid_;
};
}  // namespace node

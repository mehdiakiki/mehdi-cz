#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

/* FAULT_CALL names the function (fsync, fdatasync or write), FAULT_AT the call number
   that fails (counting from 1), FAULT_ERRNO the error (EIO by default, or ENOSPC).
   Only writes to regular files count, and never writes to descriptors 0, 1 and 2. */

static long calls;

static int fault_now(const char *name)
{
	const char *which = getenv("FAULT_CALL");
	const char *at = getenv("FAULT_AT");

	if (!which || !at || strcmp(which, name) != 0)
		return 0;
	return ++calls == atol(at);
}

static int fault_errno(void)
{
	const char *name = getenv("FAULT_ERRNO");

	return name && strcmp(name, "ENOSPC") == 0 ? ENOSPC : EIO;
}

int fsync(int fd)
{
	static int (*real)(int);

	if (!real)
		real = (int (*)(int))dlsym(RTLD_NEXT, "fsync");
	if (fault_now("fsync")) {
		errno = fault_errno();
		return -1;
	}
	return real(fd);
}

int fdatasync(int fd)
{
	static int (*real)(int);

	if (!real)
		real = (int (*)(int))dlsym(RTLD_NEXT, "fdatasync");
	if (fault_now("fdatasync")) {
		errno = fault_errno();
		return -1;
	}
	return real(fd);
}

ssize_t write(int fd, const void *buf, size_t count)
{
	static ssize_t (*real)(int, const void *, size_t);
	struct stat st;

	if (!real)
		real = (ssize_t (*)(int, const void *, size_t))dlsym(RTLD_NEXT, "write");
	if (fd > 2 && fstat(fd, &st) == 0 && S_ISREG(st.st_mode) && fault_now("write")) {
		errno = fault_errno();
		return -1;
	}
	return real(fd, buf, count);
}

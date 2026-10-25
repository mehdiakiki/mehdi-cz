#ifndef VARARGS_H
#define VARARGS_H

#include <stdarg.h>
#include <stddef.h>

#ifdef VARARGS_CHECKED
#define VARARGS_PRINTF(fmt_index, first_index) __attribute__((format(printf, fmt_index, first_index)))
#define VARARGS_SENTINEL __attribute__((sentinel))
#else
#define VARARGS_PRINTF(fmt_index, first_index)
#define VARARGS_SENTINEL
#endif

long rv_sum(int count, ...);
long rv_vsum(int count, va_list args);
double rv_mean(int count, ...);
char *rv_join_path(const char *first, ...) VARARGS_SENTINEL;
char *rv_format(const char *fmt, ...) VARARGS_PRINTF(1, 2);
char *rv_cformat(const char *fmt, ...) VARARGS_PRINTF(1, 2);
long rv_sum_array(const int *values, size_t len);
void rv_free(char *text);

#endif

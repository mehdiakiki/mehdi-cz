#include <pwd.h>
#include <stdio.h>

int main(int argc, char **argv)
{
    const char *name = argc > 1 ? argv[1] : "root";
    struct passwd *pw = getpwnam(name);
    if (pw)
        printf("%s has uid %u\n", name, (unsigned)pw->pw_uid);
    else
        printf("%s: no such user\n", name);
    return 0;
}

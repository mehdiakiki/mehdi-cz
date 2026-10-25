#include <stdbool.h>
#include <stdio.h>

extern bool rust_fn_returning_bool(unsigned char flags);

__attribute__((noinline)) static const char *if_ret(unsigned char flags) {
    if (rust_fn_returning_bool(flags)) {
        return "then";
    }
    return "else";
}

__attribute__((noinline)) static const char *if_not_ret(unsigned char flags) {
    if (!rust_fn_returning_bool(flags)) {
        return "then";
    }
    return "else";
}

__attribute__((noinline)) static const char *if_ret_equals_true(unsigned char flags) {
    if (rust_fn_returning_bool(flags) == true) {
        return "then";
    }
    return "else";
}

__attribute__((noinline)) static int as_int(unsigned char flags) {
    return (int)rust_fn_returning_bool(flags);
}

__attribute__((noinline)) static int negated(unsigned char flags) {
    return !rust_fn_returning_bool(flags);
}

__attribute__((noinline)) static int double_negated(unsigned char flags) {
    return !!rust_fn_returning_bool(flags);
}

__attribute__((noinline)) static int masked(unsigned char flags) {
    return rust_fn_returning_bool(flags) & 1;
}

struct branch_check {
    const char *expression;
    const char *(*run)(unsigned char flags);
};

struct value_check {
    const char *expression;
    int (*run)(unsigned char flags);
};

int main(void) {
    static const unsigned char inputs[] = {0x00, 0x01, 0x10, 0x11};
    static const struct branch_check branches[] = {
        {"if (ret)", if_ret},
        {"if (!ret)", if_not_ret},
        {"if (ret == true)", if_ret_equals_true},
    };
    static const struct value_check values[] = {
        {"(int)ret", as_int},
        {"!ret", negated},
        {"!!ret", double_negated},
        {"ret & 1", masked},
    };

    for (unsigned c = 0; c < sizeof branches / sizeof branches[0]; c++) {
        printf("%-17s", branches[c].expression);
        for (unsigned i = 0; i < sizeof inputs; i++) {
            printf(" 0x%02x->%s", inputs[i], branches[c].run(inputs[i]));
        }
        printf("\n");
    }
    for (unsigned c = 0; c < sizeof values / sizeof values[0]; c++) {
        printf("%-17s", values[c].expression);
        for (unsigned i = 0; i < sizeof inputs; i++) {
            printf(" 0x%02x->%d", inputs[i], values[c].run(inputs[i]));
        }
        printf("\n");
    }
    return 0;
}

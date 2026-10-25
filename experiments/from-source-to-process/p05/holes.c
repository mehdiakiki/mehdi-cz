extern int total;
void greet(void);

int counter = 1;
int *pointer = &counter;

int read_counter(void)
{
    return counter;
}

int read_total(void)
{
    return total;
}

void call_greet(void)
{
    greet();
}

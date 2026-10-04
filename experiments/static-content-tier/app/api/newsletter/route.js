export async function POST(request) {
  const { email } = await request.json().catch(() => ({}));
  if (typeof email !== "string" || !email.includes("@")) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  return Response.json({ message: "Fixture subscription accepted." }, { status: 201 });
}

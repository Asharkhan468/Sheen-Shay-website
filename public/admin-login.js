const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Signing in…";
  try {
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        email: form.elements.email.value,
        password: form.elements.password.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to sign in.");
    location.assign("/admin");
  } catch (error) {
    errorBox.textContent = error.message || "Unable to sign in. Please try again.";
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Sign in securely";
  }
});

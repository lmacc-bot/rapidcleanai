const SAFE_CODE_PATTERN = /^[a-z_]+$/;

const loginErrorMessages = {
  auth_unavailable: "Sign-in is temporarily unavailable. Please try again shortly.",
  invalid_credentials: "Unable to sign in with those credentials.",
  invalid_email: "Enter a valid email address.",
  missing_fields: "Email and password are required.",
  login_failed: "Unable to sign in right now. Please try again.",
} as const;

const signupErrorMessages = {
  auth_unavailable: "Account signup is temporarily unavailable. Please try again shortly.",
  email_taken: "An account already exists for that email address.",
  invalid_email: "Enter a valid email address.",
  invalid_name: "Enter your full name.",
  missing_fields: "Name, email, and password are required.",
  password_too_long: "Password must be 128 characters or fewer.",
  signup_failed: "Unable to create your account right now. Please try again.",
  weak_password: "Password must be at least 8 characters.",
} as const;

const infoMessages = {
  signup_success: "Account created successfully. You can now access your dashboard.",
  signup_success_check_email:
    "Account created. Check your email if confirmation is required, then sign in.",
} as const;

function readSafeCode(value: string | string[] | undefined) {
  if (typeof value !== "string" || !SAFE_CODE_PATTERN.test(value)) {
    return null;
  }

  return value;
}

export function getLoginErrorMessage(value: string | string[] | undefined) {
  const code = readSafeCode(value);
  if (!code) {
    return null;
  }

  return loginErrorMessages[code as keyof typeof loginErrorMessages] ?? loginErrorMessages.login_failed;
}

export function getSignupErrorMessage(value: string | string[] | undefined) {
  const code = readSafeCode(value);
  if (!code) {
    return null;
  }

  return signupErrorMessages[code as keyof typeof signupErrorMessages] ?? signupErrorMessages.signup_failed;
}

export function getInfoMessage(value: string | string[] | undefined) {
  const code = readSafeCode(value);
  if (!code) {
    return null;
  }

  return infoMessages[code as keyof typeof infoMessages] ?? null;
}

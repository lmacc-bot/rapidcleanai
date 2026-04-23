const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const MULTI_SPACE = /[^\S\r\n]+/g;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_EMAIL_LENGTH = 254;
export const MAX_NAME_LENGTH = 80;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_SIGNUP_PASSWORD_LENGTH = 8;
export const MAX_CONTACT_MESSAGE_LENGTH = 2000;
export const MAX_CHAT_PROMPT_CHARS = 2000;

type ValidationFailure = {
  success: false;
  code: string;
  message: string;
};

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

export type ValidationResult<T> = ValidationFailure | ValidationSuccess<T>;

type SanitizeOptions = {
  maxLength?: number;
  preserveNewlines?: boolean;
};

type ContactInput = {
  name: string;
  email: string;
  message: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type SignupInput = {
  name: string;
  email: string;
  password: string;
};

function trimToMaxLength(value: string, maxLength?: number) {
  if (!maxLength || value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength);
}

export function sanitizePlainText(input: string, options: SanitizeOptions = {}) {
  const normalized = input.normalize("NFKC").replace(CONTROL_CHARS, "");
  const lineEndingSafe = options.preserveNewlines
    ? normalized.replace(/\r\n?/g, "\n")
    : normalized.replace(/\s+/g, " ");
  const collapsedWhitespace = options.preserveNewlines
    ? lineEndingSafe
        .split("\n")
        .map((line) => line.replace(MULTI_SPACE, " ").trim())
        .join("\n")
    : lineEndingSafe.replace(MULTI_SPACE, " ");

  return trimToMaxLength(collapsedWhitespace.trim(), options.maxLength);
}

export function readFormField(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email);
}

export function validateLoginInput(input: LoginInput): ValidationResult<LoginInput> {
  const email = sanitizePlainText(input.email, { maxLength: MAX_EMAIL_LENGTH }).toLowerCase();
  const password = input.password;

  if (!email || !password) {
    return {
      success: false,
      code: "missing_fields",
      message: "Email and password are required.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      success: false,
      code: "invalid_email",
      message: "Enter a valid email address.",
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      success: false,
      code: "login_failed",
      message: "Unable to sign in right now. Please try again.",
    };
  }

  return {
    success: true,
    data: {
      email,
      password,
    },
  };
}

export function validateSignupInput(input: SignupInput): ValidationResult<SignupInput> {
  const name = sanitizePlainText(input.name, { maxLength: MAX_NAME_LENGTH });
  const email = sanitizePlainText(input.email, { maxLength: MAX_EMAIL_LENGTH }).toLowerCase();
  const password = input.password;

  if (!name || !email || !password) {
    return {
      success: false,
      code: "missing_fields",
      message: "Name, email, and password are required.",
    };
  }

  if (name.length < 2) {
    return {
      success: false,
      code: "invalid_name",
      message: "Enter your full name.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      success: false,
      code: "invalid_email",
      message: "Enter a valid email address.",
    };
  }

  if (password.length < MIN_SIGNUP_PASSWORD_LENGTH) {
    return {
      success: false,
      code: "weak_password",
      message: "Password must be at least 8 characters.",
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      success: false,
      code: "password_too_long",
      message: "Password must be 128 characters or fewer.",
    };
  }

  return {
    success: true,
    data: {
      name,
      email,
      password,
    },
  };
}

export function validateContactInput(input: ContactInput): ValidationResult<ContactInput> {
  const name = sanitizePlainText(input.name, { maxLength: MAX_NAME_LENGTH });
  const email = sanitizePlainText(input.email, { maxLength: MAX_EMAIL_LENGTH }).toLowerCase();
  const message = sanitizePlainText(input.message, {
    maxLength: MAX_CONTACT_MESSAGE_LENGTH,
    preserveNewlines: true,
  });

  if (!name || !email || !message) {
    return {
      success: false,
      code: "missing_fields",
      message: "Name, email, and message are required.",
    };
  }

  if (name.length < 2) {
    return {
      success: false,
      code: "invalid_name",
      message: "Enter your full name.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      success: false,
      code: "invalid_email",
      message: "Enter a valid email address.",
    };
  }

  if (message.length < 10) {
    return {
      success: false,
      code: "invalid_message",
      message: "Add a little more detail so we can help.",
    };
  }

  return {
    success: true,
    data: {
      name,
      email,
      message,
    },
  };
}

export function validateChatPromptInput(input: unknown): ValidationResult<string> {
  if (typeof input !== "string") {
    return {
      success: false,
      code: "invalid_prompt",
      message: "Enter a valid quote request.",
    };
  }

  const prompt = sanitizePlainText(input, {
    maxLength: MAX_CHAT_PROMPT_CHARS,
    preserveNewlines: true,
  });

  if (!prompt) {
    return {
      success: false,
      code: "missing_prompt",
      message: "Enter the job details you want to quote.",
    };
  }

  if (prompt.length < 8) {
    return {
      success: false,
      code: "short_prompt",
      message: "Add a little more scope detail so we can generate a quote.",
    };
  }

  return {
    success: true,
    data: prompt,
  };
}

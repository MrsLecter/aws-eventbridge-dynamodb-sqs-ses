import jwt from "jsonwebtoken";

export const generateTokens = (email: string) => {
  const accessToken = jwt.sign({ email }, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  });
  const refreshToken = jwt.sign({ email }, process.env.JWT_SECRET as string);
  return { accessToken, refreshToken };
};

export const getEmailFromToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      email: string;
      iat: number;
    };
    return decoded.email;
  } catch (err) {
    throw new Error("Invalid token");
  }
};

export const isValidLinkId = (id: string) => {
  if (!id || id.length !== +(process.env.LINK_ID_LENGTH as string)) {
    return false;
  }
  return true;
};

export const isValidCredentials = ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const EMAIL_REGEXP = /[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,20}$/;
  const PASSWORD_REGEXP = /.{8,}/;

  const isValidEmail = !!email.match(EMAIL_REGEXP);
  const isValidPassword = !!password.match(PASSWORD_REGEXP);
  if (!isValidEmail || !isValidPassword) return false;
  return true;
};

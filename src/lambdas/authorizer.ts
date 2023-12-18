import {
  APIGatewayAuthorizerResult,
  Context,
  APIGatewayRequestAuthorizerEvent,
} from "aws-lambda";
import jwt from "jsonwebtoken";

export const handler = async (
  _event: APIGatewayRequestAuthorizerEvent,
  _context: Context
) => {
  const methodArn = _event.methodArn;

  const authAuthorizationToken = _event.headers?.Authorization?.replace(
    "Bearer ",
    ""
  );
  const authorizationToken = _event.headers?.authorization?.replace(
    "Bearer ",
    ""
  );
  const authBearerToken = authAuthorizationToken ?? authorizationToken;

  if (!authBearerToken) {
    return getFormedPolicy("Deny", methodArn);
  }
  try {
    verifyToken(authBearerToken);
    return getFormedPolicy("Allow", methodArn);
  } catch (err) {
    return getFormedPolicy("Deny", methodArn);
  }
};

function verifyToken(token: string) {
  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (err) {
    throw Error("Token expired");
  }
}

function getFormedPolicy(effect: "Deny" | "Allow", methodArn?: string) {
  const baseArn = methodArn ? methodArn.split("/")[0] + "/*/*" : "*";

  const defaultPolicy = {
    principalId: "anonymous",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: baseArn,
        },
      ],
    },
  } as APIGatewayAuthorizerResult;
  return defaultPolicy;
}

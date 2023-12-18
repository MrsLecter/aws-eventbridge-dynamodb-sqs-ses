import type {
  Context,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyEventV2,
  Handler,
} from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import dynamoDb from "../libs/dynamodb";

import bcryptjs from "bcryptjs";
import { generateTokens, isValidCredentials } from "../common/utils";

export const handler: Handler = async (
  _event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const { email, password } = JSON.parse(_event.body || "");
    if (!isValidCredentials({ email, password })) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid credentials",
        }),
      };
    }

    const currentUser = await getUserFromDb(email);
    if (!currentUser) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "User with that email not found",
        }),
      };
    }

    const isValidPassword = await isSamePassword({
      inputPassword: password,
      hashedPassword: currentUser.password,
    });
    if (!isValidPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Password not valid",
        }),
      };
    }

    const { accessToken, refreshToken } = generateTokens(email);
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          accessToken,
          refreshToken,
        },
        null,
        2
      ),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: (error as Error).message,
      }),
    };
  }
};

async function isSamePassword({
  inputPassword,
  hashedPassword,
}: {
  inputPassword: string;
  hashedPassword: string;
}) {
  const match = await bcryptjs.compare(inputPassword, hashedPassword);
  return !!match;
}

async function getUserFromDb(email: string) {
  try {
    const command = new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: email,
      },
    });
    const dbResp = await dynamoDb.send(command);
    return dbResp.Item;
  } catch (err) {
    console.log(err);
    throw new Error("Database error");
  }
}

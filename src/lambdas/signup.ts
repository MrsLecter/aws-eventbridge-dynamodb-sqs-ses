import type {
  Context,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyEventV2,
  Handler,
} from "aws-lambda";

import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
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

    const oldUser = await getUserFromDb(email);
    if (oldUser) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "User with that email address is already registered",
        }),
      };
    }

    const passwordHash = await getHashedPassword(password);
    await addUserToDb({
      email,
      password: passwordHash,
    });

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
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: (error as Error).message,
      }),
    };
  }
};

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

async function addUserToDb({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    const command = new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        PK: email,
        password,
      },
    });
    await dynamoDb.send(command);
  } catch (err) {
    console.log(err);
    throw new Error("Database error!");
  }
}

async function getHashedPassword(password: string) {
  const hastRound = process.env.PASSWORD_HASH_ROUND as string;
  const salt = bcryptjs.genSaltSync(+hastRound);
  const hash = bcryptjs.hashSync(password, salt);
  return hash;
}

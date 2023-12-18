import type {
  Context,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyEventV2,
  Handler,
} from "aws-lambda";
import { getEmailFromToken } from "../common/utils";
import { QueryCommand } from "@aws-sdk/client-dynamodb";
import dynamoDb from "../libs/dynamodb";

export const handler: Handler = async (
  _event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const bearerToken = _event.headers.authorization?.replace("Bearer ", "");
    const userEmail = getEmailFromToken(bearerToken as string);
    const links = getAllLinksForCreator(userEmail);
    return {
      statusCode: 200,
      body: JSON.stringify({ links }, null, 2),
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

async function getAllLinksForCreator(creator: string) {
  try {
    const queryParams = {
      TableName: "test-table",
      IndexName: "creator-index",
      KeyConditionExpression: "creator = :creatorEmail",
      ExpressionAttributeValues: {
        ":creatorEmail": { S: "user1" },
      },
    };
    const command = new QueryCommand(queryParams);
    const dbresponse = await dynamoDb.send(command);
    return dbresponse.Items;
  } catch (err) {
    console.log(err);
    throw new Error("Database error");
  }
}

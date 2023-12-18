import type {
  Context,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyEventV2,
  Handler,
} from "aws-lambda";
import dynamoDb from "../libs/dynamodb";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { isValidLinkId } from "../common/utils";

export const handler: Handler = async (
  _event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const linkId = _event.pathParameters?.linkId || "";
    if (!isValidLinkId(linkId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: `Invalid link id`,
        }),
      };
    }

    const linkObject = await getFullLinkFromDb(linkId);
    const updatedVisitCount = linkObject?.visitCount + 1;
    await updateVisitCount({ linkId, visitCount: updatedVisitCount });

    if (linkObject && linkObject.originalLink) {
      return {
        statusCode: 302,
        headers: {
          Location: linkObject.originalLink,
        },
      };
    }
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: `Link with id [${linkId}] not found`,
      }),
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

async function getFullLinkFromDb(id: string) {
  try {
    const command = new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: id,
      },
    });
    const dbResp = await dynamoDb.send(command);
    return dbResp.Item;
  } catch (err) {
    console.log(err);
    throw new Error("Database error");
  }
}

async function updateVisitCount({
  linkId,
  visitCount,
}: {
  linkId: string;
  visitCount: number;
}) {
  try {
    const command = new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: linkId,
      },
      UpdateExpression: "set visitCount = :count",
      ExpressionAttributeValues: {
        ":count": `${visitCount}`,
      },
    });
    await dynamoDb.send(command);
  } catch (err) {
    console.log(err);
    throw new Error("Database error");
  }
}

import type {
  Context,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyEventV2,
  Handler,
} from "aws-lambda";
import dynamoDb from "../libs/dynamodb";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { isValidLinkId } from "../common/utils";

export const handler: Handler = async (
  _event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const { id } = _event.pathParameters as { id: string };
    if (!isValidLinkId(id)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: `Invalid link id`,
          linkLength: process.env.LINK_ID_LENGTH,
          idLength: id.length,
        }),
      };
    }
    await deleteLink(id);
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          message: `Link [${id}] successfully deleted`,
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

async function deleteLink(id: string) {
  try {
    const command = new DeleteCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: id,
      },
    });
    await dynamoDb.send(command);
  } catch (err) {
    console.log(err);
    throw new Error("Database error");
  }
}

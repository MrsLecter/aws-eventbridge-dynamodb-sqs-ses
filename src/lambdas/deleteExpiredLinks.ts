import type { Context, APIGatewayProxyEventV2, Handler } from "aws-lambda";

import { ScanCommand } from "@aws-sdk/client-dynamodb";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import dynamoDb from "../libs/dynamodb";

export const handler: Handler = async (
  _event: APIGatewayProxyEventV2,
  _context: Context
) => {
  try {
    const expiredLinks = await getExpiredLinks();
    if (expiredLinks && expiredLinks.length > 0) {
      for (let link of expiredLinks) {
        await deleteLink(link.PK.S as string);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

async function deleteLink(linkId: string) {
  try {
    const command = new DeleteCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: linkId,
      },
    });
    await dynamoDb.send(command);
  } catch (err) {
    console.log(err);
    throw new Error("Database error");
  }
}

async function getExpiredLinks() {
  try {
    const nowDate = new Date().getTime();
    const input = {
      TableName: process.env.TABLE_NAME,
      ScanFilter: {
        expireIn: {
          AttributeValueList: [
            {
              N: `${nowDate}`,
            },
          ],
          ComparisonOperator: "LE",
        },
      },
    };
    //@ts-ignore
    const command = new ScanCommand(input);
    const dbresponse = await dynamoDb.send(command);
    return dbresponse.Items;
  } catch (err) {
    console.log(err);
    throw new Error("Database error");
  }
}

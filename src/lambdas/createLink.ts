import type {
  Context,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyEventV2,
  Handler,
} from "aws-lambda";
import dynamoDb from "../libs/dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getEmailFromToken } from "../common/utils";

const LINK_EXPIRATION_TERMS = {
  "one-time": 0,
  "1d": 1,
  "3d": 3,
  "7d": 7,
};

const REGXEP_URL =
  "^(https?:\\/\\/)?" +
  "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" +
  "((\\d{1,3}\\.){3}\\d{1,3}))" +
  "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
  "(\\?[;&a-z\\d%_.~+=-]*)?" +
  "(\\#[-a-z\\d_]*)?$";
("i");

type UrlExpirationTerms = keyof typeof LINK_EXPIRATION_TERMS;

export const handler: Handler = async (
  _event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const { url, ttl } = JSON.parse(_event.body || "");

    if (!isValidUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "The entered url is not valid",
        }),
      };
    }

    if (!(ttl in LINK_EXPIRATION_TERMS)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Expiration term not allowed",
        }),
      };
    }
    const urlId = getRandomLinkId();
    const expireIn = getExpirationTimeMs(ttl);
    const expireInString = expireIn
      ? prettifyDate(new Date(expireIn))
      : "post-use removal";
    const bearerToken = _event.headers.authorization?.replace("Bearer ", "");
    const userEmail = getEmailFromToken(bearerToken as string);
    await addLinkToDb({ urlId, url, userEmail, expireIn });

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          creator: userEmail,
          shortLinkId: urlId,
          originalSource: url,
          expired: expireInString,
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

function isValidUrl(url: string) {
  try {
    const urlPattern = new RegExp(REGXEP_URL);
    return !!new URL(url) && !!urlPattern.test(url);
  } catch (e) {
    return false;
  }
}

function getRandomLinkId() {
  return Math.random().toString(36).substring(2, 8);
}

function getExpirationTimeMs(days: UrlExpirationTerms) {
  const day = LINK_EXPIRATION_TERMS[days];
  if (!day) return 0;

  const dayInMs = day * 24 * 60 * 60 * 1000;
  const expireIn = new Date().getTime() + dayInMs;
  return expireIn;
}

function prettifyDate(currentDate: Date) {
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  return `${day}/${month}/${year}`;
}

async function addLinkToDb({
  urlId,
  url,
  userEmail,
  expireIn,
}: {
  urlId: string;
  url: string;
  userEmail: string;
  expireIn: number;
}) {
  try {
    const command = new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        PK: urlId,
        longLink: url,
        creator: userEmail,
        expireIn,
        visitCount: "0",
      },
    });
    await dynamoDb.send(command);
  } catch (err) {
    console.log(err);
    throw new Error("Database error");
  }
}

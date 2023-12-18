import { SendEmailCommand } from "@aws-sdk/client-ses";
import sesClient from "../libs/ses";
import { Context, Handler } from "aws-lambda/handler";
import { SQSEvent } from "aws-lambda/trigger/sqs";

export const handler: Handler = async (_event: SQSEvent, _context: Context) => {
  try {
    const emailParams = _event.Records.map((record) => {
      const { creator, url } = JSON.parse(record.body);
      return {
        creator: creator.S,
        link: url.S,
      };
    });
    for (let email of emailParams) {
      const sendEmailCommand = createSendEmailCommand(
        email.creator,
        email.link
      );
      await sesClient.send(sendEmailCommand);
    }
  } catch (e) {
    console.error("Failed to send email.");
    return e;
  }
};

function createSendEmailCommand(toAddress: string, link: string) {
  return new SendEmailCommand({
    Destination: {
      ToAddresses: [...toAddress],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `Your link ${link} successfully deleted!`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "ShortLinker notification",
      },
    },
    Source: process.env.SERVICE_EMAIL,
  });
}

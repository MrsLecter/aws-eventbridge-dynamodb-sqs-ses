import { SESClient } from "@aws-sdk/client-ses";

const REGION = "us-east-1";
const sesClient = new SESClient({ region: REGION });

export default sesClient;

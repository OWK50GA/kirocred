import { PinataSDK } from "pinata";
import { envConfig } from "../config";

const { pinataJwt, pinataGatewayUrl } = envConfig;

export const pinata = new PinataSDK({
  pinataJwt: pinataJwt,
  pinataGateway: pinataGatewayUrl,
});

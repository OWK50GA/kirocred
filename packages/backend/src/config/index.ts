import { config } from "dotenv";

config();

const starknetRpcUrl = process.env.STARKNET_RPC_URL;
if (!starknetRpcUrl) throw new Error("Starknet RPC Url not set");

const accountAddress = process.env.STARKNET_ACCOUNT_ADDRESS;
if (!accountAddress) throw new Error("Starknet Account address not set");

const privateKey = process.env.STARKNET_PRIVATE_KEY;
if (!privateKey) throw new Error("Starknet Private key not set");

const pinataJwt = process.env.PINATA_JWT;
if (!pinataJwt) throw new Error("Pinata jwt not set");

const pinataGatewayUrl = process.env.PINATA_GATEWAY_URL;
if (!pinataGatewayUrl) throw new Error("Pinata gateway url not set");

const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) throw new Error("Kirocred contract address not set");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("Kirocred dbUrl missing");

const port = process.env.PORT || 3001;
const env = process.env.NODE_ENV || "development";

export const envConfig = {
  starknetRpcUrl,
  accountAddress,
  pinataGatewayUrl,
  pinataJwt,
  privateKey,
  contractAddress,
  port,
  env,
  dbUrl
};

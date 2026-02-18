import { PinataSDK } from "pinata";
import crypto from "crypto";
import { pinata } from "./config"

/**
 * Encrypted package structure for IPFS storage
 */
export interface EncryptedPackage {
  encryptedData: string; // Encrypted JSON of CredentialPackage
  iv: string;
  authTag: string;
}

/**
 * IPFS Client for storing and retrieving encrypted credential packages
 * Uses Pinata as the IPFS provider
 */
export class IPFSClient {
  private pinata: PinataSDK;
  private encryptionKey: Buffer;

  /**
   * Initialize IPFS client with Pinata credentials
   * @param pinataJwt - Pinata JWT token for authentication
   * @param encryptionKey - 256-bit key for encrypting packages before IPFS storage
   */
  constructor(encryptionKey?: Buffer) {
    this.pinata = pinata;

    // Use provided key or generate a default one (in production, this should come from secure config)
    this.encryptionKey = encryptionKey || crypto.randomBytes(32);
  }

  /**
   * Encrypt package data before IPFS storage
   * @param data - Data to encrypt (will be JSON stringified)
   * @returns EncryptedPackage with ciphertext, IV, and auth tag
   */
  private encryptPackageData(data: any): EncryptedPackage {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);

    const plaintext = JSON.stringify(data);
    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      encryptedData: ciphertext,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  }

  /**
   * Decrypt package data retrieved from IPFS
   * @param encryptedPackage - Encrypted package with ciphertext, IV, and auth tag
   * @returns Decrypted data object
   */
  private decryptPackageData(encryptedPackage: EncryptedPackage): any {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      Buffer.from(encryptedPackage.iv, "hex"),
    );

    decipher.setAuthTag(Buffer.from(encryptedPackage.authTag, "hex"));

    let plaintext = decipher.update(
      encryptedPackage.encryptedData,
      "hex",
      "utf8",
    );
    plaintext += decipher.final("utf8");

    return JSON.parse(plaintext);
  }

  /**
   * Store encrypted credential package on IPFS
   * @param packageData - Credential package data to store
   * @returns IPFS CID (Content Identifier)
   */
  async storePackage(packageData: any): Promise<{
    group_id: string,
    cid: string
  }> {
    try {
      // Encrypt the package before storing
      const encryptedPackage = this.encryptPackageData(packageData);

      // Upload to IPFS via Pinata
      // const upload = await (this.pinata.upload as any).json(encryptedPackage);
      const upload = await this.pinata.upload.public.json(encryptedPackage, {
        groupId: "some-group-id",
        
      })

      return {
        group_id: upload.group_id!,
        cid: upload.cid
      };
    } catch (error) {
      throw new Error(
        `Failed to store package on IPFS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Retrieve and decrypt credential package from IPFS
   * @param cid - IPFS Content Identifier
   * @returns Decrypted credential package data
   */
  async retrievePackage(cid: string): Promise<any> {
    try {
      // Retrieve from IPFS via Pinata gateway
      // const response = await (this.pinata.gateways as any).get(cid);
      const response = await this.pinata.gateways.public.get(cid);
      const data = response.data;

      // Handle different data types from Pinata
      let encryptedPackage: EncryptedPackage;
      if (typeof data === "string") {
        encryptedPackage = JSON.parse(data) as EncryptedPackage;
      } else if (data instanceof Blob) {
        const text = await data.text();
        encryptedPackage = JSON.parse(text) as EncryptedPackage;
      } else {
        encryptedPackage = data as unknown as EncryptedPackage;
      }

      // Decrypt and return
      return this.decryptPackageData(encryptedPackage);
    } catch (error) {
      throw new Error(
        `Failed to retrieve package from IPFS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Store encrypted package directly (already encrypted)
   * Used when the package is pre-encrypted with holder-specific keys
   * @param encryptedPackage - Pre-encrypted package
   * @returns IPFS CID
   */
  async storeEncryptedPackage(
    encryptedPackage: EncryptedPackage,
  ): Promise<string> {
    try {
      const upload = await (this.pinata.upload as any).json(encryptedPackage);
      return upload.IpfsHash || upload.cid;
    } catch (error) {
      throw new Error(
        `Failed to store encrypted package on IPFS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Retrieve encrypted package without decryption
   * Used when the package needs to be decrypted by the holder
   * @param cid - IPFS Content Identifier
   * @returns Encrypted package
   */
  async retrieveEncryptedPackage(cid: string): Promise<EncryptedPackage> {
    try {
      const response = await (this.pinata.gateways as any).get(cid);
      const data = response.data;

      // Handle different data types from Pinata
      if (typeof data === "string") {
        return JSON.parse(data) as EncryptedPackage;
      } else if (data instanceof Blob) {
        const text = await data.text();
        return JSON.parse(text) as EncryptedPackage;
      } else {
        return data as unknown as EncryptedPackage;
      }
    } catch (error) {
      throw new Error(
        `Failed to retrieve encrypted package from IPFS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// /**
//  * Create IPFS client instance
//  * @param pinataJwt - Pinata JWT token
//  * @param encryptionKey - Optional encryption key for package encryption
//  * @returns IPFSClient instance
//  */
// export function createIPFSClient(
//   pinataJwt: string,
//   encryptionKey?: Buffer,
// ): IPFSClient {
//   return new IPFSClient(pinataJwt, encryptionKey);
// }

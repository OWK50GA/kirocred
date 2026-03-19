export interface CredentialData {
  holderPublicKey: string;
  credentialId: string;
  attributes: Record<string, any>;
  issuerSignedMessage: string;
  issuerMessageHash: string;
}
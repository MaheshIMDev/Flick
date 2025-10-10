import sodium from 'libsodium-wrappers';

export async function generateKeyBundle(userId: string) {
  await sodium.ready;
  
  // Identity keypair (Ed25519 for signing)
  const identityKeyPair = sodium.crypto_sign_keypair();
  
  // Signed prekey (X25519 for encryption)
  const signedPreKeyPair = sodium.crypto_box_keypair();
  const signedPreKeyId = 1;
  
  // Sign the prekey public with identity private key
  const signature = sodium.crypto_sign_detached(
    signedPreKeyPair.publicKey,
    identityKeyPair.privateKey
  );
  
  // Generate 100 one-time prekeys (X25519 for encryption)
  const prekeys = [];
  for (let i = 1; i <= 100; i++) {
    const preKeyPair = sodium.crypto_box_keypair();
    prekeys.push({
      user_id: userId,
      prekey_id: i,
      prekey_public: sodium.to_base64(preKeyPair.publicKey),
      created_at: new Date().toISOString()
    });
  }

  return {
    identity_public_key: sodium.to_base64(identityKeyPair.publicKey),
    signed_prekey_id: signedPreKeyId,
    signed_prekey_public: sodium.to_base64(signedPreKeyPair.publicKey),
    signed_prekey_signature: sodium.to_base64(signature),
    prekeys
  };
}

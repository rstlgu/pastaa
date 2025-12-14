import { NextRequest, NextResponse } from 'next/server';
import { p384 } from '@noble/curves/p384';
import { bytesToHex } from '@noble/ciphers/utils';

// Server-side Layer 2 key pair (regenerated per instance)
// In production, you might want to persist this or use HSM
let serverKeyPair: { privateKey: Uint8Array; publicKey: Uint8Array } | null = null;

function getServerKeyPair() {
  if (!serverKeyPair) {
    const privateKey = p384.utils.randomPrivateKey();
    const publicKey = p384.getPublicKey(privateKey);
    serverKeyPair = { privateKey, publicKey };
  }
  return serverKeyPair;
}

// POST - Layer 2 key exchange handshake
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientPublicKey } = body;

    if (!clientPublicKey) {
      return NextResponse.json({ error: 'Missing client public key' }, { status: 400 });
    }

    const keys = getServerKeyPair();

    // Return server's public key
    // Client will use this to derive shared secret
    return NextResponse.json({
      serverPublicKey: bytesToHex(keys.publicKey),
      // In a full implementation, we'd also include RSA signature
      // of the ECDH public key for verification
    });
  } catch (error) {
    console.error('Handshake error:', error);
    return NextResponse.json({ error: 'Handshake failed' }, { status: 500 });
  }
}


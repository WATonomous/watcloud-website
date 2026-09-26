import { Base64 } from 'js-base64'
import { sha256 } from 'js-sha256'

export function sshHostKeyFingerprint(publicKey: string): string | null {
    const [keyType, encodedKey] = publicKey.trim().split(/\s+/)
    if (!keyType || !encodedKey || !Base64.isValid(encodedKey)) {
        return null
    }

    // OpenSSH hashes the decoded key blob and omits Base64 padding.
    const digest = sha256.array(Base64.toUint8Array(encodedKey))
    const fingerprint = Base64.fromUint8Array(new Uint8Array(digest)).replace(/=+$/, '')
    return `${keyType} SHA256:${fingerprint}`
}

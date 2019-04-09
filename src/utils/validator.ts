import { HttpError, ErrorCode, HttpStatusCode } from './httperror';
import { Certificate } from 'thor-devkit'
import { Address } from 'thor-model-kit'

export default class Validator {
    static validateTimestamp(timestamp: number, expiration: number) {
        if (Date.now() / 1000 - timestamp > expiration) {
            throw new HttpError("certificate expired", ErrorCode.Certificate_Expired, HttpStatusCode.Forbidden)
        }
    }

    static validateCertificate(cert: Certificate) {
        try {
            Certificate.verify(cert)
        } catch (err) {
            throw new HttpError("certificate verified failed", ErrorCode.Certificate_Verified_Failed, HttpStatusCode.Forbidden)
        }
    }

    static validateAddress(a: string) {
        let addr;
        try {
            addr = Address.fromHex(a);
        } catch (err) {
            throw new HttpError("signer: invalid address" + a, ErrorCode.Parameter_Address, HttpStatusCode.BadRequest)
        }
        return addr
    }
}
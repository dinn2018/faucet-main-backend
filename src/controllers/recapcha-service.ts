import RecapchaAPI from '../api/recapcha-api';
import { HttpError, ErrorCode, HttpStatusCode } from '../utils/httperror';
import Config from '../utils/config';
import { log1, log2 } from '../utils/logger'

export default class RecapchaService {
    private recapchaAPI: RecapchaAPI
    private config: Config

    constructor(config: Config) {
        this.config = config
        this.recapchaAPI = new RecapchaAPI(config.recapchaSecretKey)
    }

    async verifyRecapcha(token: string) {
        let result = await this.recapchaAPI.verifyRecaptcha(token)
        if (!result.success) {
            log2.error("recapcha verified failed", result)
            throw new HttpError("recapcha verified failed", ErrorCode.Recapcha_Verified_Failed, HttpStatusCode.Forbidden)
        }
        if (result.score < this.config.recapchaMinScore) {
            log2.error("recapcha score too low", result, "min score", this.config.recapchaMinScore)
            throw new HttpError("recapcha score too low", ErrorCode.Recapcha_Low_Score, HttpStatusCode.Forbidden)
        }
        return result.score
    }
}
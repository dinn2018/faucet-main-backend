import RecapchaAPI from '../api/recapcha-api';
import { HttpError, ErrorCode, HttpStatusCode } from '../utils/httperror';
import Config from '../utils/config';
import { logger } from '../utils/logger'

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
            logger.error("recapcha verified failed", result)
            throw new HttpError("recapcha verified failed", ErrorCode.Recapcha_Verified_Failed, HttpStatusCode.Forbidden)
        }
        if (result.score < this.config.recapchaMinScore) {
            logger.error("System is busy now please try again", result, "min score", this.config.recapchaMinScore)
            throw new HttpError("The network is busy. Please try again.", ErrorCode.Recapcha_Low_Score, HttpStatusCode.Forbidden)
        }
        return result.score
    }
}
import DB from '../utils/db';
import { Address, Transaction, BigInt, Secp256k1, Bytes32, keccak256 } from 'thor-model-kit';
import { abi } from 'thor-devkit'
import ThorAPI from '../api/thor-api';
import Config from '../utils/config';
import { logger } from '../utils/logger'
import { HttpError, ErrorType, HttpStatusCode } from '../utils/httperror';
import BigNumber from 'bignumber.js';
import { randomBytes } from 'crypto'

export default class TransactionService {
    private db: DB
    private thorAPI: ThorAPI
    private config: Config
    constructor(db: DB, config: Config) {
        this.db = db
        this.thorAPI = new ThorAPI(config.networkAPIAddr)
        this.config = config
    }
    async scheduleApproved(timestamp: number) {
        let latestSchedule = await this.db.query("select * from Schedule where Schedule.from <= ? order by Schedule.from desc limit 0,1", [timestamp])
        if (latestSchedule.length == 0) {
            throw new HttpError("NO Schedule", ErrorType.NO_Schedule, HttpStatusCode.Forbidden)
        }
        let schedule = latestSchedule[0]
        if (timestamp < schedule.from || timestamp > schedule.to) {
            throw new HttpError("NOT in Schedule", ErrorType.NOT_IN_Schedule, HttpStatusCode.Forbidden)
        }
        let scheduleLimit = await this.db.query('select ifnull(count(*),0) as count from Records where timestamp >= ? and timestamp <= ?', [schedule.from, schedule.to])
        if (scheduleLimit.length != 0 && scheduleLimit[0].count >= schedule.limit) {
            throw new HttpError(`rateLimit Exceed, users can only send ${schedule.limit} requests in current schedule`, ErrorType.Schedule_RateLimit_Exceeded, HttpStatusCode.Forbidden)
        }
        logger.info(`Schedule=${schedule.from} ${schedule.to} Limit=${schedule.limit} count=${scheduleLimit[0].count}`)
        return schedule
    }

    async certHashApproved(certHash: string) {
        let results = await this.db.query("select ifnull(count(*),0) as count from Records where certhash = ?;", certHash)
        if (results.length > 0 && results[0].count >= 1) {
            logger.error("this certificate has already been used", "cert hash", certHash)
            throw new HttpError("this certificate has already been used", ErrorType.Certificate_Expired, HttpStatusCode.Forbidden)
        }
    }

    async balanceApproved() {
        let acc = await this.thorAPI.getAccount(this.config.addr)
        let balance = new BigNumber(acc.balance)
        let eng = new BigNumber(acc.eng)
        if (balance.isLessThan(this.config.vetLimit)) {
            logger.error(`insufficient vet`, balance, this.config.vetLimit)
            throw new HttpError(`insufficient vet`, ErrorType.Insufficient_Vet, HttpStatusCode.Forbidden)
        }
        if (eng.isLessThan(this.config.thorLimit)) {
            logger.error(`insufficient energy`, eng, this.config.thorLimit)
            throw new HttpError(`insufficient energy`, ErrorType.Insufficient_Thor, HttpStatusCode.Forbidden)
        }
    }

    async addressApproved(to: Address, latestSchedule: any) {
        try {
            let results = await this.db.query("select ifnull(count(*),0) as count from Records where timestamp >= ? and timestamp <= ? and address = ?", [latestSchedule.from, latestSchedule.to, to.toString()])
            if (results.length > 0 && results[0].count >= 1) {
                logger.error(`rateLimit Exceed, one address can only send one requests in current schedule`, "count:" + results[0].count)
                throw new HttpError(`rateLimit Exceed, one address can only send one requests in current schedule`, ErrorType.Address_RateLimit_Exceeded, HttpStatusCode.Forbidden)
            }
        } catch (err) {
            throw err
        }
    }

    async ipApproved(ip: string, latestSchedule: any) {
        try {
            let results = await this.db.query("select ifnull(count(*),0) as count from Records where timestamp >= ? and timestamp <= ? and ip = ?", [latestSchedule.from, latestSchedule.to, ip])
            if (results.length > 0 && results[0].count >= 1) {
                logger.error(`rateLimit Exceed, one ip address can only send one requests in current schedule`, "count:" + results[0].count)
                throw new HttpError(`rateLimit Exceed, one ip address can only send one requests in current schedule`, ErrorType.IP_RateLimit_Exceeded, HttpStatusCode.Forbidden)
            }
        } catch (err) {
            throw err
        }
    }

    async txApproved(txid: Bytes32) {
        try {
            let results = await this.db.query("select ifnull(count(*),0) as count from Records where txid = ?;", txid.bytes)
            if (results.length > 0 && results[0].count > 0) {
                logger.error("transaction is pending")
                throw new HttpError("transaction is pending", ErrorType.Exist_Transaction, HttpStatusCode.Forbidden)
            }
        } catch (err) {
            throw err
        }
    }

    async insertTx(txid: Bytes32, to: Address, ip: string, timestamp: number, certHash: string, latestSchedule: any) {
        try {
            let vet = new BigNumber(latestSchedule.vet).multipliedBy(1e18)
            let thor = new BigNumber(latestSchedule.thor).multipliedBy(1e18)
            await this.db.query("INSERT INTO Records (txid, address,ip, vet, thor, timestamp, certhash) VALUES (?, ?, ?, ?, ?, ?, ?);", [txid.toString(),
            to.toString(),
                ip,
            vet.toString(10),
            thor.toString(10),
                timestamp,
                certHash]
            )
        } catch (err) {
            logger.error("insertTx", err)
            throw err
        }
    }

    async buildTx(to: Address, latestSchedule: any) {
        try {
            let vet = new BigNumber(latestSchedule.vet).multipliedBy(1e18)
            let thor = new BigNumber(latestSchedule.thor).multipliedBy(1e18)
            let coder = new abi.Function({ "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "success", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" })
            let data = coder.encode(to.toString(), thor)
            let clauses = [{
                to: to,
                value: BigInt.from(vet),
                data: Buffer.alloc(0)
            }, {
                to: Address.fromHex('0x0000000000000000000000000000456e65726779'),
                value: BigInt.from(0),
                data: Buffer.from(data.slice(2), "hex")
            }]
            let bestBlock = await this.thorAPI.bestBlock()
            let nonce = '0x' + randomBytes(8).toString('hex')
            let body: Transaction.Body = {
                chainTag: this.config.chainTag,
                blockRef: Buffer.from(bestBlock.id.slice(2, 18), "hex"),
                expiration: 32,
                clauses: clauses,
                gasPriceCoef: 255,
                gas: BigInt.from(100000),
                dependsOn: null,
                nonce: BigInt.from(nonce),
                reserved: []
            }
            let tx = new Transaction(body)
            tx.signature = Secp256k1.sign(tx.signingHash, Bytes32.fromHex(this.config.privateKey))
            return tx
        } catch (err) {
            logger.error("buildTx err", err)
            throw err
        }
    }
    async send(tx: Transaction) {
        try {
            let raw = tx.encode()
            await this.thorAPI.sendTx(raw)
        } catch (err) {
            logger.error("sent tx err", err)
            throw err
        }
    }
}

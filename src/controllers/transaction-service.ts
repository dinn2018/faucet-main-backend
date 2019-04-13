import Record from '../sequelize-models/record.models';
import Schedule from '../sequelize-models/schedule.model';
import { Address, Transaction, BigInt, Secp256k1, Bytes32 } from 'thor-model-kit';
import { abi } from 'thor-devkit'
import ThorAPI from '../api/thor-api';
import Config from '../utils/config';
import { logger } from '../utils/logger'
import { HttpError, ErrorCode, HttpStatusCode } from '../utils/httperror';
import { BigNumber } from 'bignumber.js';
import { randomBytes } from 'crypto'
import { Op } from 'sequelize';

export default class TransactionService {
    private thorAPI: ThorAPI
    private config: Config
    constructor(config: Config) {
        this.thorAPI = new ThorAPI(config.networkAPIAddr)
        this.config = config
    }
    async scheduleApproved(timestamp: number) {
        let latestSchedules = await Schedule.findAll({
            order: [['to', 'ASC']],
            where: {
                to: {
                    [Op.gt]: [timestamp]
                }
            },
            limit: 1
        })
        if (latestSchedules.length == 0) {
            throw new HttpError("Rewards are not available at this time. Please come back later.", ErrorCode.NO_Schedule, HttpStatusCode.Forbidden)
        }
        let latestSchedule = latestSchedules[0]
        if (timestamp < latestSchedule.from) {
            throw new HttpError(`Rewards are not available at this time. Please come back later.`, ErrorCode.NOT_IN_Schedule, HttpStatusCode.Forbidden)
        }
        let count = await Record.count({
            where: {
                timestamp: {
                    [Op.and]: {
                        [Op.gte]: latestSchedule.from,
                        [Op.lte]: latestSchedule.to
                    }
                }
            }
        })
        logger.info(`Schedule=${latestSchedule.from} ${latestSchedule.to} Limit=${latestSchedule.limit} count=${count}`)
        if (count >= latestSchedule.limit) {
            throw new HttpError(`Rewards are not available at this time. Please come back later.`, ErrorCode.Schedule_RateLimit_Exceeded, HttpStatusCode.Forbidden)
        }
        return latestSchedule
    }

    async certHashApproved(certHash: string) {
        let count = await Record.count({
            where: {
                certhash: certHash
            }
        })
        if (count > 0) {
            logger.error("this certificate has already been used", "cert hash", certHash)
            throw new HttpError("this certificate has already been used", ErrorCode.Certificate_Expired, HttpStatusCode.Forbidden)
        }
    }

    async balanceApproved() {
        let acc = await this.thorAPI.getAccount(this.config.addr)
        let balance = new BigNumber(acc.balance)
        let eng = new BigNumber(acc.eng)
        if (balance.isLessThan(this.config.vetLimit)) {
            logger.error(`insufficient vet`, balance, this.config.vetLimit)
            throw new HttpError(`You are too late. All of the rewards have now been claimed for this session.`, ErrorCode.Insufficient_Vet, HttpStatusCode.Forbidden)
        }
        if (eng.isLessThan(this.config.thorLimit)) {
            logger.error(`insufficient energy`, eng, this.config.thorLimit)
            throw new HttpError(`You are too late. All of the rewards have now been claimed for this session.`, ErrorCode.Insufficient_Thor, HttpStatusCode.Forbidden)
        }
    }

    async addressApproved(addr: Address, latestSchedule: Schedule) {
        try {
            let count = await Record.count({
                where: {
                    timestamp: {
                        [Op.and]: {
                            [Op.gte]: latestSchedule.from,
                            [Op.lte]: latestSchedule.to
                        }
                    },
                    address: addr.toString()
                }
            })
            if (count > 0) {
                logger.error(`rateLimit Exceed, one address can only send one requests in current schedule`, "count:" + count)
                throw new HttpError(`You have already claimed rewards for this session. Please try again at next session.`, ErrorCode.Address_RateLimit_Exceeded, HttpStatusCode.Forbidden)
            }
        } catch (err) {
            throw err
        }
    }

    async ipApproved(ip: string, latestSchedule: Schedule) {
        try {
            let count = await Record.count({
                where: {
                    timestamp: {
                        [Op.and]: {
                            [Op.gte]: latestSchedule.from,
                            [Op.lte]: latestSchedule.to
                        }
                    },
                    ip: ip
                }
            })
            if (count > 0) {
                logger.error(`rateLimit Exceed, one ip address can only send one requests in current schedule`, "count:" + count)
                throw new HttpError(`You have already claimed rewards for this session. Please try again at next session.`, ErrorCode.IP_RateLimit_Exceeded, HttpStatusCode.Forbidden)
            }
        } catch (err) {
            throw err
        }
    }

    async txApproved(txid: Bytes32) {
        try {
            let count = await Record.count({
                where: {
                    txid: txid.toString()
                }
            })
            if (count > 0) {
                logger.error("transaction is pending")
                throw new HttpError("transaction is pending", ErrorCode.Exist_Transaction, HttpStatusCode.Forbidden)
            }
        } catch (err) {
            throw err
        }
    }

    async insertTx(txid: Bytes32, addr: Address, ip: string, timestamp: number, certHash: string, latestSchedule: Schedule) {
        try {
            let vet = new BigNumber(latestSchedule.vet).multipliedBy(1e18)
            let thor = new BigNumber(latestSchedule.thor).multipliedBy(1e18)
            await Record.create({
                txid: txid.toString(),
                address: addr.toString(),
                ip: ip,
                vet: vet.toString(10),
                thor: thor.toString(10),
                timestamp: timestamp,
                certhash: certHash
            })
        } catch (err) {
            throw err
        }
    }

    async buildTx(addr: Address, latestSchedule: any) {
        try {
            let vet = new BigNumber(latestSchedule.vet).multipliedBy(1e18)
            let thor = new BigNumber(latestSchedule.thor).multipliedBy(1e18)
            let coder = new abi.Function({ "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "success", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" })
            let data = coder.encode(addr.toString(), thor)
            let clauses = [{
                to: addr,
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
            throw err
        }
    }
    async send(tx: Transaction) {
        try {
            let raw = tx.encode()
            await this.thorAPI.sendTx(raw)
        } catch (err) {
            throw err
        }
    }
}

import { Table, Column, Model, DataType } from 'sequelize-typescript'

@Table({
    tableName: 'Record',
    timestamps: false
})
export default class Record extends Model<Record> {

    @Column({
        type: DataType.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    }) id: number

    @Column({
        type: DataType.CHAR(66),
        unique: { name: 'txid', msg: 'txid' }
    }) txid: string

    @Column({
        type: DataType.CHAR(42),
    }) address: string

    @Column({
        type: DataType.STRING,
    }) ip: string

    @Column({
        type: DataType.STRING,
    }) vet: string

    @Column({
        type: DataType.STRING,
    }) thor: string

    @Column({
        type: DataType.CHAR(66),
        unique: { name: 'certhash', msg: 'certhash' }
    }) certhash: string

    @Column({
        type: DataType.DOUBLE,
    }) timestamp: number

}
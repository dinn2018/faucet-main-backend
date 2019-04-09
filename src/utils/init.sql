
SET NAMES utf8mb4;

CREATE TABLE `Records` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `txid` char(66) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `address` char(42) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT '',
  `ip` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `vet` varchar(200) COLLATE utf8mb4_general_ci DEFAULT '',
  `thor` varchar(200) COLLATE utf8mb4_general_ci DEFAULT '',
  `timestamp` double DEFAULT NULL,
  `certhash` char(66) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `txid` (`txid`),
  KEY `address` (`address`),
  KEY `vet` (`vet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `Schedule`
(
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `vet` int(10) DEFAULT NULL,
  `thor` int(10) DEFAULT NULL,
  `from` double DEFAULT NULL,
  `to` double DEFAULT NULL,
  `limit` int(10) DEFAULT NULL,
  PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

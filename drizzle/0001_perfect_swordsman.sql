CREATE TABLE `developer_providers` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`baseUrl` varchar(500) NOT NULL,
	`model` varchar(160) NOT NULL,
	`encryptedApiKey` text NOT NULL,
	`isEnabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_providers_id` PRIMARY KEY(`id`)
);

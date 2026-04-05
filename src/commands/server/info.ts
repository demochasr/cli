import { Command, Flags } from "@oclif/core";
import chalk from "chalk";
import inquirer from "inquirer";

import { getServer, getServers, type Server } from "../../utils/shared.js";
import { readAuthConfig } from "../../utils/utils.js";

export default class ServerInfo extends Command {
	static description = "Show details for a Dokploy server.";

	static examples = [
		"$ <%= config.bin %> server info",
		"$ <%= config.bin %> server info --serverId <serverId>",
	];

	static flags = {
		serverId: Flags.string({
			char: "s",
			description: "ID of the Dokploy server",
			required: false,
		}),
	};

	public async run(): Promise<void> {
		const auth = await readAuthConfig(this);
		const { flags } = await this.parse(ServerInfo);
		let { serverId } = flags;

		if (!serverId) {
			const servers = await getServers(auth, this);
			const answer = await inquirer.prompt<{ serverId: string }>([
				{
					choices: servers.map((server) => ({
						name: `${server.name} (${server.ipAddress}:${server.port})`,
						value: server.serverId,
					})),
					message: "Select a server:",
					name: "serverId",
					type: "list",
				},
			]);
			serverId = answer.serverId;
		}

		const server = await getServer(auth, this, serverId);
		this.printServer(server);
	}

	private printServer(server: Server): void {
		this.log(chalk.blue.bold(`\n  Server ${server.name} \n`));
		this.log(`Server ID: ${chalk.green(server.serverId)}`);
		this.log(`Address: ${chalk.green(`${server.ipAddress}:${server.port}`)}`);
		this.log(`Username: ${chalk.green(server.username)}`);
		this.log(`Status: ${chalk.green(server.serverStatus || "unknown")}`);
		this.log(`Type: ${chalk.green(server.serverType || "unknown")}`);
		this.log(`SSH Key ID: ${chalk.green(server.sshKeyId || "n/a")}`);
		this.log(`App Name: ${chalk.green(server.appName || "n/a")}`);
		if (server.description) {
			this.log(`Description: ${chalk.green(server.description)}`);
		}
	}
}

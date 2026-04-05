import { Command } from "@oclif/core";
import chalk from "chalk";
import Table from "cli-table3";

import { getServers } from "../../utils/shared.js";
import { readAuthConfig } from "../../utils/utils.js";

export default class ServerList extends Command {
	static description = "List all Dokploy servers, including remote deployment nodes.";

	static examples = [
		"$ <%= config.bin %> server list",
		"$ DOKPLOY_URL=http://127.0.0.1:4580 DOKPLOY_AUTH_TOKEN=xxx <%= config.bin %> server list",
	];

	public async run(): Promise<void> {
		const auth = await readAuthConfig(this);
		const servers = await getServers(auth, this);

		const table = new Table({
			head: ["Server ID", "Name", "Address", "User", "Status", "Type"],
			style: { head: ["cyan"] },
			wordWrap: true,
		});

		for (const server of servers) {
			table.push([
				server.serverId,
				server.name,
				`${server.ipAddress}:${server.port}`,
				server.username,
				server.serverStatus || "unknown",
				server.serverType || "unknown",
			]);
		}

		this.log(chalk.blue.bold("\n  Dokploy Servers \n"));
		this.log(table.toString());
	}
}

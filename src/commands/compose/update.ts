import { Command, Flags } from "@oclif/core";
import chalk from "chalk";
import * as fs from "node:fs";

import { getCompose, trpcMutation } from "../../utils/shared.js";
import { readAuthConfig } from "../../utils/utils.js";

export default class ComposeUpdate extends Command {
	static description =
		"Update a Docker Compose service. Useful for changing source type, compose file, env, and Git settings.";

	static examples = [
		"$ <%= config.bin %> compose update --composeId <composeId> --sourceType raw --composeFile ./docker-compose.yml",
		"$ <%= config.bin %> compose update --composeId <composeId> --sourceType github --owner demochasr --repository turn_proxy --branch main --githubId <githubId>",
	];

	static flags = {
		composeId: Flags.string({
			char: "c",
			description: "ID of the compose service",
			required: true,
		}),
		name: Flags.string({
			char: "n",
			description: "Compose service name",
			required: false,
		}),
		description: Flags.string({
			char: "d",
			description: "Compose service description",
			required: false,
		}),
		sourceType: Flags.string({
			description: "Source type",
			options: ["raw", "github", "git", "gitlab", "bitbucket", "gitea"],
			required: false,
		}),
		composeType: Flags.string({
			description: "Compose type",
			options: ["docker-compose", "stack"],
			required: false,
		}),
		composeFile: Flags.string({
			description: "Path to docker-compose file content to upload",
			required: false,
		}),
		envFile: Flags.string({
			description: "Path to .env-style file to upload into Dokploy env",
			required: false,
		}),
		composePath: Flags.string({
			description: "Compose path inside the repository",
			required: false,
		}),
		owner: Flags.string({
			description: "GitHub owner",
			required: false,
		}),
		repository: Flags.string({
			description: "GitHub repository",
			required: false,
		}),
		branch: Flags.string({
			description: "Git branch",
			required: false,
		}),
		githubId: Flags.string({
			description: "Dokploy GitHub provider ID",
			required: false,
		}),
		command: Flags.string({
			description: "Custom deploy command",
			required: false,
		}),
		watchPaths: Flags.string({
			description: "Comma-separated watch paths",
			required: false,
		}),
		autoDeploy: Flags.boolean({
			description: "Enable or disable auto deploy",
			required: false,
		}),
	};

	public async run(): Promise<void> {
		const auth = await readAuthConfig(this);
		const { flags } = await this.parse(ComposeUpdate);
		const compose = await getCompose(auth, this, flags.composeId);

		const payload: Record<string, unknown> = {
			composeId: flags.composeId,
		};

		if (flags.name) payload.name = flags.name;
		if (flags.description !== undefined) payload.description = flags.description;
		if (flags.sourceType) payload.sourceType = flags.sourceType;
		if (flags.composeType) payload.composeType = flags.composeType;
		if (flags.composePath) payload.composePath = flags.composePath;
		if (flags.owner) payload.owner = flags.owner;
		if (flags.repository) payload.repository = flags.repository;
		if (flags.branch) payload.branch = flags.branch;
		if (flags.githubId) payload.githubId = flags.githubId;
		if (flags.command !== undefined) payload.command = flags.command;
		if (flags.autoDeploy !== undefined) payload.autoDeploy = flags.autoDeploy;
		if (flags.watchPaths) {
			payload.watchPaths = flags.watchPaths
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);
		}
		if (flags.composeFile) {
			payload.composeFile = fs.readFileSync(flags.composeFile, "utf8");
		}
		if (flags.envFile) {
			payload.env = fs.readFileSync(flags.envFile, "utf8");
		}

		if (Object.keys(payload).length === 1) {
			this.error(chalk.yellow("No update fields provided."));
			return;
		}

		await trpcMutation(auth, "compose.update", payload);
		this.log(
			chalk.green(
				`Compose '${compose.name}' updated successfully.`,
			),
		);
	}
}

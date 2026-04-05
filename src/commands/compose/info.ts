import { Command, Flags } from "@oclif/core";
import chalk from "chalk";
import inquirer from "inquirer";

import {
	getCompose,
	getProjects,
	type ComposeService,
	type Environment,
	type Project,
} from "../../utils/shared.js";
import { readAuthConfig } from "../../utils/utils.js";

type ComposeSelection = {
	project: Project;
	environment: Environment;
	composeId: string;
};

export default class ComposeInfo extends Command {
	static description = "Show details for a Docker Compose service.";

	static examples = [
		"$ <%= config.bin %> compose info",
		"$ <%= config.bin %> compose info --composeId <composeId>",
	];

	static flags = {
		composeId: Flags.string({
			char: "c",
			description: "ID of the compose service",
			required: false,
		}),
	};

	public async run(): Promise<void> {
		const auth = await readAuthConfig(this);
		const { flags } = await this.parse(ComposeInfo);
		let { composeId } = flags;

		if (!composeId) {
			composeId = await this.selectComposeId(auth);
		}

		const compose = await getCompose(auth, this, composeId);
		this.printCompose(compose);
	}

	private async selectComposeId(auth: { token: string; url: string }): Promise<string> {
		const projects = await getProjects(auth, this);

		const { project } = await inquirer.prompt<{ project: Project }>([
			{
				choices: projects.map((item) => ({
					name: item.name,
					value: item,
				})),
				message: "Select a project:",
				name: "project",
				type: "list",
			},
		]);

		if (!project.environments?.length) {
			this.error(chalk.yellow("No environments found in this project."));
		}

		const { environment } = await inquirer.prompt<{ environment: Environment }>([
			{
				choices: project.environments.map((item) => ({
					name: `${item.name} (${item.description})`,
					value: item,
				})),
				message: "Select an environment:",
				name: "environment",
				type: "list",
			},
		]);

		if (!environment.compose?.length) {
			this.error(chalk.yellow("No compose services found in this environment."));
		}

		const { composeId } = await inquirer.prompt<ComposeSelection>([
			{
				choices: environment.compose.map((item: ComposeService) => ({
					name: `${item.name} (${item.composeStatus || "unknown"})`,
					value: item.composeId,
				})),
				message: "Select a compose service:",
				name: "composeId",
				type: "list",
			},
		]);

		return composeId;
	}

	private printCompose(compose: ComposeService): void {
		this.log(chalk.blue.bold(`\n  Compose ${compose.name} \n`));
		this.log(`Compose ID: ${chalk.green(compose.composeId)}`);
		this.log(`App Name: ${chalk.green(compose.appName)}`);
		this.log(`Status: ${chalk.green(compose.composeStatus || "unknown")}`);
		this.log(`Source Type: ${chalk.green(compose.sourceType || "unknown")}`);
		this.log(`Compose Type: ${chalk.green(compose.composeType || "unknown")}`);
		this.log(`Server ID: ${chalk.green(compose.serverId || "local")}`);
		this.log(`Environment ID: ${chalk.green(compose.environmentId || "n/a")}`);
		this.log(`Compose Path: ${chalk.green(compose.composePath || "./docker-compose.yml")}`);
		if (compose.repository || compose.owner || compose.branch) {
			this.log(
				`Git: ${chalk.green(
					`${compose.owner || "?"}/${compose.repository || "?"}@${compose.branch || "?"}`,
				)}`,
			);
		}
		if (compose.description) {
			this.log(`Description: ${chalk.green(compose.description)}`);
		}
		if (compose.deployments?.length) {
			const latest = compose.deployments[0];
			this.log(`Latest Deployment: ${chalk.green(latest.status || "unknown")}`);
			if (latest.title) {
				this.log(`Deployment Title: ${chalk.green(latest.title)}`);
			}
			if (latest.errorMessage) {
				this.log(`Deployment Error: ${chalk.red(latest.errorMessage)}`);
			}
			if (latest.logPath) {
				this.log(`Log Path: ${chalk.green(latest.logPath)}`);
			}
		}
	}
}

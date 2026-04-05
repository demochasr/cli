import { Command, Flags } from "@oclif/core";
import chalk from "chalk";
import inquirer from "inquirer";

import {
	getProjects,
	trpcMutation,
	type ComposeService,
	type Environment,
	type Project,
} from "../../utils/shared.js";
import { readAuthConfig } from "../../utils/utils.js";

export default class ComposeDeploy extends Command {
	static description = "Deploy a Docker Compose service, including services on remote servers.";

	static examples = [
		"$ <%= config.bin %> compose deploy",
		"$ <%= config.bin %> compose deploy --composeId <composeId>",
	];

	static flags = {
		composeId: Flags.string({
			char: "c",
			description: "ID of the compose service to deploy",
			required: false,
		}),
		title: Flags.string({
			description: "Deployment title",
			required: false,
		}),
		description: Flags.string({
			char: "d",
			description: "Deployment description",
			required: false,
		}),
		skipConfirm: Flags.boolean({
			char: "y",
			description: "Skip confirmation prompt",
			default: false,
		}),
	};

	public async run(): Promise<void> {
		const auth = await readAuthConfig(this);
		const { flags } = await this.parse(ComposeDeploy);
		let { composeId, title, description } = flags;

		if (!composeId) {
			composeId = await this.selectComposeId(auth);
		}

		if (!flags.skipConfirm) {
			const confirm = await inquirer.prompt<{ proceed: boolean }>([
				{
					default: false,
					message: "Do you want to deploy this compose service?",
					name: "proceed",
					type: "confirm",
				},
			]);

			if (!confirm.proceed) {
				this.error(chalk.yellow("Compose deployment cancelled."));
				return;
			}
		}

		const result = await trpcMutation<{ success: boolean; message?: string }>(
			auth,
			"compose.deploy",
			{
				composeId,
				title,
				description,
			},
		);

		if (!result?.success) {
			this.error(chalk.red("Compose deployment failed."));
		}

		this.log(chalk.green(result.message || "Compose deployment queued."));
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

		const { composeId } = await inquirer.prompt<{ composeId: string }>([
			{
				choices: environment.compose.map((item: ComposeService) => ({
					name: `${item.name} (${item.composeStatus || "unknown"})`,
					value: item.composeId,
				})),
				message: "Select a compose service to deploy:",
				name: "composeId",
				type: "list",
			},
		]);

		return composeId;
	}
}
